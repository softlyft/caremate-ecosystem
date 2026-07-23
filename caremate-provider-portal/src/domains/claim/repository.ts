import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

export type ClaimableOrg = {
  id: string;
  name: string;
};

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashClaimCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export function generateClaimCode(): string {
  return String(randomInt(100000, 999999));
}

function codesMatch(expectedHash: string, submittedCode: string): boolean {
  const submitted = Buffer.from(hashClaimCode(submittedCode));
  const expected = Buffer.from(expectedHash);
  if (submitted.length !== expected.length) return false;
  return timingSafeEqual(submitted, expected);
}

function emailsFromOrgResource(resource: Json | null | undefined): string[] {
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return [];
  const contact = (resource as { contact?: unknown }).contact;
  const blocks = Array.isArray(contact) ? contact : contact ? [contact] : [];
  const emails: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const telecom = (block as { telecom?: unknown }).telecom;
    const entries = Array.isArray(telecom) ? telecom : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const system = String((entry as { system?: unknown }).system ?? '').toLowerCase();
      const value = String((entry as { value?: unknown }).value ?? '').trim();
      if (system === 'email' && value.includes('@')) {
        emails.push(normalizeEmail(value));
      }
    }
  }
  return emails;
}

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

  // Fallback: Organization FHIR contact telecom when no location email matched.
  if (orgIds.size === 0) {
    const { data: orgs, error: orgError } = await admin
      .from('provider_organizations')
      .select('id, name, resource')
      .is('deleted_at', null);

    if (orgError) throw orgError;

    for (const org of orgs ?? []) {
      if (emailsFromOrgResource(org.resource).includes(normalized)) {
        orgIds.add(org.id);
      }
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

export async function createClaimChallenge(input: {
  organizationId: string;
  email: string;
}): Promise<{ claimId: string; debugCode: string; expiresAt: string }> {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);
  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

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

  // Production must never return the OTP (org claim takeover). Local/dev may until email is wired.
  const allowInlineOtp =
    process.env.ALLOW_INLINE_OTP === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.ALLOW_INLINE_OTP !== 'false');

  return {
    claimId: data.id,
    debugCode: allowInlineOtp ? code : '',
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
    .update({ attempts: claim.attempts + 1, ...(ok ? { verified_at: new Date().toISOString() } : {}) })
    .eq('id', claim.id);

  if (!ok) throw new Error('Invalid verification code');

  return { organizationId: claim.organization_id, email: claim.email };
}

export async function completeOrgClaim(input: {
  claimId: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string; organizationId: string; email: string }> {
  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

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

  // Ensure still unclaimed
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

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((u) => normalizeEmail(u.email ?? '') === email);

  if (existing) {
    // Existing auth user — only allow if they are not already a portal member elsewhere? Allow claim as owner of this org.
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
  if (memberError) throw memberError;

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
