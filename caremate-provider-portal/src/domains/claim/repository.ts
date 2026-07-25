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

export type ClaimableOrg = {
  id: string;
  name: string;
};

export { generateClaimCode, hashClaimCode, normalizeEmail } from '@/domains/claim/crypto';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Find unclaimed organizations whose ingested contact email matches. */
export async function findClaimableOrgsByEmail(email: string): Promise<ClaimableOrg[]> {
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  const { data: locations, error: locError } = await admin
    .from('provider_locations')
    .select('organization_id')
    .ilike('email', normalized)
    .is('deleted_at', null);

  if (locError) throw locError;

  const orgIds = new Set<string>(
    (locations ?? []).map((row) => String(row.organization_id)).filter(Boolean),
  );

  // Fallback: Organization FHIR contact telecom via SQL (unclaimed only).
  if (orgIds.size === 0) {
    const { data: fhirOrgs, error: fhirError } = await admin.rpc(
      'find_unclaimed_orgs_by_contact_email',
      { p_email: normalized },
    );
    if (fhirError) throw fhirError;
    for (const org of fhirOrgs ?? []) {
      orgIds.add(String(org.id));
    }
  }

  if (orgIds.size === 0) return [];

  const { data: orgs, error: fetchError } = await admin
    .from('provider_organizations')
    .select('id, name')
    .in('id', [...orgIds])
    .is('deleted_at', null);

  if (fetchError) throw fetchError;

  const claimable: ClaimableOrg[] = [];
  for (const org of orgs ?? []) {
    const { count, error } = await admin
      .from('provider_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .is('deleted_at', null);

    if (error) throw error;
    if ((count ?? 0) === 0) {
      claimable.push({ id: org.id, name: org.name });
    }
  }

  return claimable;
}

/** Best-effort SES OTP via Edge Function (service role). */
async function sendClaimOtpEmail(input: {
  to: string;
  code: string;
  orgName: string;
}): Promise<{ delivered: boolean; skipped: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { delivered: false, skipped: true, error: 'Supabase env missing' };
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/send-provider-claim-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: input.to,
        code: input.code,
        orgName: input.orgName,
        expiresMinutes: Math.round(CODE_TTL_MS / 60000),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      skipped?: boolean;
      error?: string;
      reason?: string;
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

    return {
      delivered: false,
      skipped: false,
      error: payload.error ?? `Email send failed (${response.status})`,
    };
  } catch (err) {
    return {
      delivered: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    };
  }
}

export async function createClaimChallenge(input: {
  organizationId: string;
  email: string;
  ipHash?: string | null;
}): Promise<{ claimId: string; expiresAt: string }> {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);

  await assertOtpSendAllowed({ kind: 'claim', email, ipHash: input.ipHash });

  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { data: org } = await admin
    .from('provider_organizations')
    .select('name')
    .eq('id', input.organizationId)
    .maybeSingle();

  const { data, error } = await admin
    .from('provider_org_claims')
    .insert({
      organization_id: input.organizationId,
      email,
      code_hash: hashClaimCode(code),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) throw error;

  const mail = await sendClaimOtpEmail({
    to: email,
    code,
    orgName: org?.name ?? 'your organization',
  });

  await recordOtpSend({ kind: 'claim', email, ipHash: input.ipHash });

  if (!mail.delivered) {
    logWarn('claim-otp', 'Claim OTP email failed', {
      claimId: data.id,
      skipped: mail.skipped,
      error: mail.error,
    });
    throw new Error(
      mail.skipped
        ? 'Verification email is not configured yet. Contact SoftLyft support.'
        : (mail.error ?? 'Could not send verification email. Try again later.'),
    );
  }

  return {
    claimId: data.id,
    expiresAt,
  };
}

export async function verifyClaimChallenge(input: {
  claimId: string;
  code: string;
}): Promise<{ organizationId: string; email: string }> {
  const admin = createAdminClient();
  const { data: claim, error } = await admin
    .from('provider_org_claims')
    .select('*')
    .eq('id', input.claimId)
    .maybeSingle();

  if (error) throw error;
  if (!claim) throw new Error('Claim challenge not found');
  if (claim.completed_at) throw new Error('This claim was already completed. Please sign in.');
  if (claim.attempts >= MAX_ATTEMPTS) throw new Error('Too many attempts. Start the claim again.');
  if (new Date(claim.expires_at).getTime() < Date.now()) {
    throw new Error('Verification code expired. Start the claim again.');
  }

  const ok = codesMatch(claim.code_hash, input.code);
  await admin
    .from('provider_org_claims')
    .update({
      attempts: claim.attempts + 1,
      ...(ok ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq('id', claim.id);

  if (!ok) throw new Error('Invalid verification code');

  return { organizationId: claim.organization_id, email: claim.email };
}

export async function completeOrgClaim(input: {
  claimId: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string; organizationId: string; email: string }> {
  assertPasswordRequirements(input.password);

  const admin = createAdminClient();
  const { data: claim, error } = await admin
    .from('provider_org_claims')
    .select('*')
    .eq('id', input.claimId)
    .maybeSingle();

  if (error) throw error;
  if (!claim) throw new Error('Claim challenge not found');
  if (!claim.verified_at) throw new Error('Verify the email code before setting a password');
  if (claim.completed_at) throw new Error('This claim was already completed. Please sign in.');
  if (new Date(claim.expires_at).getTime() < Date.now()) {
    throw new Error('Claim expired. Start again.');
  }

  const { count } = await admin
    .from('provider_org_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', claim.organization_id)
    .is('deleted_at', null);
  if ((count ?? 0) > 0) {
    throw new Error('This organization was already claimed');
  }

  const email = normalizeEmail(claim.email);
  let userId: string | null = null;

  const existing = await findAuthUserByEmail(email);

  if (existing) {
    const { count: memberCount } = await admin
      .from('provider_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', existing.id)
      .is('deleted_at', null);
    if ((memberCount ?? 0) > 0) {
      throw new Error('This email is already linked to another organization portal account');
    }
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        display_name: input.displayName ?? existing.user_metadata?.display_name,
        provider_portal: true,
      },
    });
    if (updated.error) throw updated.error;
    userId = existing.id;
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.displayName ?? undefined,
        provider_portal: true,
      },
    });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
  }

  if (!userId) throw new Error('Failed to create admin account');

  const { error: memberError } = await admin.from('provider_org_members').insert({
    organization_id: claim.organization_id,
    user_id: userId,
    role: 'owner',
    display_name: input.displayName ?? null,
    deleted_at: null,
  });
  if (memberError) {
    if (memberError.code === '23505') {
      throw new Error('This organization was already claimed');
    }
    throw memberError;
  }

  const { data: profile } = await admin
    .from('provider_profiles')
    .select('id')
    .eq('organization_id', claim.organization_id)
    .maybeSingle();

  if (!profile) {
    const { error: profileError } = await admin.from('provider_profiles').insert({
      organization_id: claim.organization_id,
      organization_type: 'clinic',
      email,
      verification_status: 'verified',
    });
    if (profileError) throw profileError;
  } else {
    await admin
      .from('provider_profiles')
      .update({ email, verification_status: 'verified' })
      .eq('organization_id', claim.organization_id);
  }

  await admin
    .from('provider_org_claims')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', claim.id);

  return { userId, organizationId: claim.organization_id, email };
}
