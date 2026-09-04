import { createHash } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';

export type OtpSendKind = 'community_join';

const MIN_INTERVAL_MS = 60_000;
const MAX_PER_EMAIL_PER_DAY = 10;
const MAX_PER_IP_PER_HOUR = 30;

export function hashClientIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.trim();
  if (!trimmed) return null;
  return createHash('sha256').update(trimmed).digest('hex').slice(0, 32);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Untyped until `@caremate/db-types` includes provider_auth_otp_sends. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function otpSendsFrom(): any {
  return (createAdminClient() as unknown as { from: (t: string) => unknown }).from(
    'provider_auth_otp_sends',
  );
}

/**
 * Enforce send cooldown / daily caps. Call before generating and emailing an OTP.
 * Throws a user-safe Error when limited.
 */
export async function assertOtpSendAllowed(input: {
  kind: OtpSendKind;
  email: string;
  ipHash?: string | null;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const sinceMinute = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentEmail, error: recentError } = await otpSendsFrom()
    .select('id', { count: 'exact', head: true })
    .eq('kind', input.kind)
    .eq('email', email)
    .gte('created_at', sinceMinute);

  if (recentError) throw recentError;
  if ((recentEmail ?? 0) > 0) {
    throw new Error('Please wait a minute before requesting another verification code.');
  }

  const { count: dayCount, error: dayError } = await otpSendsFrom()
    .select('id', { count: 'exact', head: true })
    .eq('kind', input.kind)
    .eq('email', email)
    .gte('created_at', sinceDay);

  if (dayError) throw dayError;
  if ((dayCount ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
    throw new Error('Too many verification emails for this address today. Try again tomorrow.');
  }

  if (input.ipHash) {
    const { count: ipCount, error: ipError } = await otpSendsFrom()
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', input.ipHash)
      .gte('created_at', sinceHour);

    if (ipError) throw ipError;
    if ((ipCount ?? 0) >= MAX_PER_IP_PER_HOUR) {
      throw new Error('Too many verification requests. Try again later.');
    }
  }
}

export async function recordOtpSend(input: {
  kind: OtpSendKind;
  email: string;
  ipHash?: string | null;
}): Promise<void> {
  const { error } = await otpSendsFrom().insert({
    kind: input.kind,
    email: normalizeEmail(input.email),
    ip_hash: input.ipHash ?? null,
  });
  if (error) throw error;
}
