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
import type { CareOrgKind } from '@/types/database';

export type ClaimableOrg = {
  id: string;
  name: string;
};

export type { CareOrgKind };

export { generateClaimCode, hashClaimCode, normalizeEmail } from '@/domains/claim/crypto';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Orgs with zero active members are claimable. Exported for unit tests. */
export function selectClaimableOrgs(
  orgs: ClaimableOrg[],
  memberCountByOrgId: Map<string, number>,
): ClaimableOrg[] {
  return orgs.filter((org) => (memberCountByOrgId.get(org.id) ?? 0) === 0);
}

/** Find unclaimed provider organizations whose ingested contact email matches. */
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

  const memberCountByOrgId = new Map<string, number>();
  for (const org of orgs ?? []) {
    const { count, error } = await admin
      .from('provider_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .is('deleted_at', null);

    if (error) throw error;
    memberCountByOrgId.set(org.id, count ?? 0);
  }

  return selectClaimableOrgs(
    (orgs ?? []).map((org) => ({ id: org.id, name: org.name })),
    memberCountByOrgId,
  );
}

/** Find unclaimed payer organizations whose catalog contact email matches. */
export async function findClaimablePayerOrgsByEmail(email: string): Promise<ClaimableOrg[]> {
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  const { data: orgs, error: fetchError } = await admin
    .from('payer_organizations')
    .select('id, name')
    .ilike('email', normalized)
    .eq('active', true)
    .is('deleted_at', null);

  if (fetchError) throw fetchError;
  if (!orgs?.length) return [];

  const memberCountByOrgId = new Map<string, number>();
  for (const org of orgs) {
    const { count, error } = await admin
      .from('payer_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .is('deleted_at', null);

    if (error) throw error;
    memberCountByOrgId.set(org.id, count ?? 0);
  }

  return selectClaimableOrgs(
    orgs.map((org) => ({ id: org.id, name: org.name })),
    memberCountByOrgId,
  );
}

export async function findClaimableOrgsForKind(
  orgKind: CareOrgKind,
  email: string,
): Promise<ClaimableOrg[]> {
  return orgKind === 'payer'
    ? findClaimablePayerOrgsByEmail(email)
    : findClaimableOrgsByEmail(email);
}

/** Best-effort SES OTP via Edge Function (service role). */
async function sendClaimOtpEmail(input: {
  to: string;
  code: string;
  orgName: string;
  orgKind: CareOrgKind;
}): Promise<{ delivered: boolean; skipped: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
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
        orgKind: input.orgKind,
        expiresMinutes: Math.round(CODE_TTL_MS / 60000),
      }),
    });

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
          'Could not authorize the verification email service. Confirm SUPABASE_SERVICE_ROLE_KEY on Care Portal matches this Supabase project, then redeploy send-provider-claim-otp.',
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

export async function createClaimChallenge(input: {
  organizationId: string;
  email: string;
  orgKind?: CareOrgKind;
  ipHash?: string | null;
}): Promise<{ claimId: string; expiresAt: string }> {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);
  const orgKind = input.orgKind ?? 'provider';
  const otpKind = orgKind === 'payer' ? 'payer_claim' : 'claim';
  const claimsTable = orgKind === 'payer' ? 'payer_org_claims' : 'provider_org_claims';
  const orgsTable = orgKind === 'payer' ? 'payer_organizations' : 'provider_organizations';

  await assertOtpSendAllowed({ kind: otpKind, email, ipHash: input.ipHash });

  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { data: org } = await admin
    .from(orgsTable)
    .select('name')
    .eq('id', input.organizationId)
    .maybeSingle();

  const { data, error } = await admin
    .from(claimsTable)
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
    orgKind,
  });

  if (!mail.delivered) {
    logWarn('claim-otp', 'Claim OTP email failed', {
      claimId: data.id,
      orgKind,
      skipped: mail.skipped,
      error: mail.error,
    });
    throw new Error(
      mail.skipped
        ? 'Verification email is not configured yet. Contact SoftLyft support.'
        : (mail.error ?? 'Could not send verification email. Try again later.'),
    );
  }

  await recordOtpSend({ kind: otpKind, email, ipHash: input.ipHash });

  return {
    claimId: data.id,
    expiresAt,
  };
}

export async function verifyClaimChallenge(input: {
  claimId: string;
  code: string;
  orgKind?: CareOrgKind;
}): Promise<{ organizationId: string; email: string }> {
  const admin = createAdminClient();
  const orgKind = input.orgKind ?? 'provider';
  const claimsTable = orgKind === 'payer' ? 'payer_org_claims' : 'provider_org_claims';

  const { data: claim, error } = await admin
    .from(claimsTable)
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
    .from(claimsTable)
    .update({
      attempts: claim.attempts + 1,
      ...(ok ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq('id', claim.id);

  if (!ok) throw new Error('Invalid verification code');

  return { organizationId: claim.organization_id, email: claim.email };
}

async function completeProviderOrgClaim(input: {
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

    const { count: payerMemberCount } = await admin
      .from('payer_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', existing.id)
      .is('deleted_at', null);
    const linkingSecondKind = (payerMemberCount ?? 0) > 0;

    const updated = await admin.auth.admin.updateUserById(existing.id, {
      ...(linkingSecondKind ? {} : { password: input.password }),
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        display_name: input.displayName ?? existing.user_metadata?.display_name,
        provider_portal: true,
        care_portal: true,
        payer_portal: linkingSecondKind
          ? true
          : (existing.user_metadata?.payer_portal ?? false),
        care_org_kind: linkingSecondKind
          ? (existing.user_metadata?.care_org_kind ?? 'payer')
          : 'provider',
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
        care_portal: true,
        care_org_kind: 'provider',
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

async function completePayerOrgClaim(input: {
  claimId: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string; organizationId: string; email: string }> {
  assertPasswordRequirements(input.password);

  const admin = createAdminClient();
  const { data: claim, error } = await admin
    .from('payer_org_claims')
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
    .from('payer_org_members')
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
      .from('payer_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', existing.id)
      .is('deleted_at', null);
    if ((memberCount ?? 0) > 0) {
      throw new Error('This email is already linked to another payer organization portal account');
    }

    const { count: providerMemberCount } = await admin
      .from('provider_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', existing.id)
      .is('deleted_at', null);
    const linkingSecondKind = (providerMemberCount ?? 0) > 0;

    const updated = await admin.auth.admin.updateUserById(existing.id, {
      ...(linkingSecondKind ? {} : { password: input.password }),
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        display_name: input.displayName ?? existing.user_metadata?.display_name,
        care_portal: true,
        payer_portal: true,
        provider_portal: linkingSecondKind
          ? true
          : (existing.user_metadata?.provider_portal ?? false),
        // Prefer newly claimed kind only when this is the first Care Portal org kind.
        care_org_kind: linkingSecondKind
          ? (existing.user_metadata?.care_org_kind ?? 'provider')
          : 'payer',
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
        care_portal: true,
        payer_portal: true,
        care_org_kind: 'payer',
      },
    });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
  }

  if (!userId) throw new Error('Failed to create admin account');

  const { error: memberError } = await admin.from('payer_org_members').insert({
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
    .from('payer_profiles')
    .select('id')
    .eq('organization_id', claim.organization_id)
    .maybeSingle();

  if (!profile) {
    const { error: profileError } = await admin.from('payer_profiles').insert({
      organization_id: claim.organization_id,
      email,
      verification_status: 'verified',
    });
    if (profileError) throw profileError;
  } else {
    await admin
      .from('payer_profiles')
      .update({ email, verification_status: 'verified' })
      .eq('organization_id', claim.organization_id);
  }

  await admin
    .from('payer_org_claims')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', claim.id);

  return { userId, organizationId: claim.organization_id, email };
}

export async function completeOrgClaim(input: {
  claimId: string;
  password: string;
  displayName?: string;
  orgKind?: CareOrgKind;
}): Promise<{ userId: string; organizationId: string; email: string; orgKind: CareOrgKind }> {
  const orgKind = input.orgKind ?? 'provider';
  const result =
    orgKind === 'payer'
      ? await completePayerOrgClaim(input)
      : await completeProviderOrgClaim(input);
  return { ...result, orgKind };
}
