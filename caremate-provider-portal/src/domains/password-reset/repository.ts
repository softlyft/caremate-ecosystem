import { randomUUID } from 'node:crypto';

import {
  codesMatch,
  generateClaimCode,
  hashClaimCode,
  normalizeEmail,
} from '@/domains/claim/crypto';
import { findAuthUserByEmail } from '@/lib/auth-users';
import { logWarn } from '@/lib/observability';
import { assertOtpSendAllowed, recordOtpSend } from '@/lib/otp-rate-limit';
import { assertPasswordRequirements } from '@/lib/password';
import { createAdminClient } from '@/lib/supabase/admin';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const GENERIC_SENT_MESSAGE =
  'If an account exists for that email, we sent a verification code. Check your inbox.';

async function hasActiveMembership(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ count: providerCount, error: providerError }, { count: payerCount, error: payerError }] =
    await Promise.all([
      admin
        .from('provider_org_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null),
      admin
        .from('payer_org_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null),
    ]);

  if (providerError) throw providerError;
  if (payerError) throw payerError;
  return (providerCount ?? 0) > 0 || (payerCount ?? 0) > 0;
}

/** Best-effort SES OTP via Edge Function (service role). */
async function sendPasswordResetOtpEmail(input: {
  to: string;
  code: string;
}): Promise<{ delivered: boolean; skipped: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return { delivered: false, skipped: true, error: 'Supabase env missing' };
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, '')}/functions/v1/send-provider-password-reset-otp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: input.to,
          code: input.code,
          expiresMinutes: Math.round(CODE_TTL_MS / 60000),
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      skipped?: boolean;
      error?: string;
      reason?: string;
      message?: string;
    };

    if (response.ok && payload.ok) {
      return { delivered: true, skipped: false };
    }

    if (response.status === 503 || payload.skipped) {
      return {
        delivered: false,
        skipped: true,
        error: payload.reason ?? payload.error ?? 'SES not configured',
      };
    }

    const remoteError = payload.error ?? payload.message ?? '';
    if (response.status === 401 || /unauthorized/i.test(remoteError)) {
      return {
        delivered: false,
        skipped: false,
        error:
          'Could not authorize the verification email service. Confirm SUPABASE_SERVICE_ROLE_KEY on Care Portal matches this Supabase project.',
      };
    }

    return {
      delivered: false,
      skipped: false,
      error: remoteError || `Email send failed (${response.status})`,
    };
  } catch (err) {
    return {
      delivered: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    };
  }
}

function opaqueResult(expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()) {
  return {
    resetId: randomUUID(),
    expiresAt,
    message: GENERIC_SENT_MESSAGE,
  };
}

/**
 * Start a password-reset challenge. Always returns a resetId + generic message
 * (anti-enumeration), including when SES fails for a known account.
 */
export async function createPasswordResetChallenge(input: {
  email: string;
  ipHash?: string | null;
}): Promise<{ resetId: string; expiresAt: string; message: string }> {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);

  await assertOtpSendAllowed({ kind: 'password_reset', email, ipHash: input.ipHash });
  // Count every start attempt (including non-members) to slow enumeration / abuse.
  await recordOtpSend({ kind: 'password_reset', email, ipHash: input.ipHash });

  const user = await findAuthUserByEmail(email);
  if (!user || !(await hasActiveMembership(user.id))) {
    return opaqueResult();
  }

  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { data, error } = await admin
    .from('provider_password_resets')
    .insert({
      user_id: user.id,
      email,
      code_hash: hashClaimCode(code),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) {
    logWarn('password-reset', 'Failed to insert reset challenge', { error: error.message });
    return opaqueResult(expiresAt);
  }

  const mail = await sendPasswordResetOtpEmail({ to: email, code });
  if (!mail.delivered) {
    logWarn('password-reset', 'Password reset OTP email failed', {
      resetId: data.id,
      skipped: mail.skipped,
      error: mail.error,
    });
    await admin.from('provider_password_resets').delete().eq('id', data.id);
    return opaqueResult(expiresAt);
  }

  return {
    resetId: data.id,
    expiresAt,
    message: GENERIC_SENT_MESSAGE,
  };
}

export async function verifyPasswordResetChallenge(input: {
  resetId: string;
  code: string;
}): Promise<{ email: string }> {
  const admin = createAdminClient();
  const { data: reset, error } = await admin
    .from('provider_password_resets')
    .select('*')
    .eq('id', input.resetId)
    .maybeSingle();

  if (error) throw error;
  if (!reset) throw new Error('Invalid or expired verification code. Start again.');
  if (reset.consumed_at) throw new Error('This reset was already used. Start again.');
  if (reset.attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many attempts. Start the password reset again.');
  }
  if (new Date(reset.expires_at).getTime() < Date.now()) {
    throw new Error('Verification code expired. Start the password reset again.');
  }

  const ok = codesMatch(reset.code_hash, input.code);
  await admin
    .from('provider_password_resets')
    .update({
      attempts: reset.attempts + 1,
      ...(ok ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq('id', reset.id);

  if (!ok) throw new Error('Invalid verification code');

  return { email: reset.email };
}

export async function completePasswordReset(input: {
  resetId: string;
  password: string;
}): Promise<{ email: string }> {
  assertPasswordRequirements(input.password);

  const admin = createAdminClient();
  const { data: reset, error } = await admin
    .from('provider_password_resets')
    .select('*')
    .eq('id', input.resetId)
    .maybeSingle();

  if (error) throw error;
  if (!reset) throw new Error('Reset challenge not found. Start again.');
  if (!reset.verified_at) throw new Error('Verify the email code before setting a password');
  if (reset.consumed_at) throw new Error('This reset was already used. Start again.');
  if (new Date(reset.expires_at).getTime() < Date.now()) {
    throw new Error('Reset expired. Start again.');
  }

  if (!(await hasActiveMembership(reset.user_id))) {
    throw new Error('This account is not a member of any provider organization.');
  }

  const updated = await admin.auth.admin.updateUserById(reset.user_id, {
    password: input.password,
  });
  if (updated.error) throw updated.error;

  await admin
    .from('provider_password_resets')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', reset.id);

  return { email: reset.email };
}
