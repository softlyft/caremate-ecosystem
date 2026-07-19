'use server';

import {
  completeOrgClaim,
  createClaimChallenge,
  findClaimableOrgsByEmail,
  verifyClaimChallenge,
} from '@/domains/claim/repository';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function startOrgClaimAction(input: {
  email: string;
  organizationId?: string;
}): Promise<
  ActionResult<{
    claimId: string;
    organizations: { id: string; name: string }[];
    /** MVP: show in UI instead of sending email */
    debugCode: string;
    expiresAt: string;
    selectedOrganizationId: string;
  }>
> {
  try {
    const organizations = await findClaimableOrgsByEmail(input.email);
    if (organizations.length === 0) {
      return {
        ok: false,
        error:
          'No unclaimed organization matched this email. Use the contact email on your CareMate catalog listing.',
      };
    }

    const selected =
      organizations.find((org) => org.id === input.organizationId) ??
      (organizations.length === 1 ? organizations[0] : null);

    if (!selected) {
      return {
        ok: true,
        data: {
          claimId: '',
          organizations,
          debugCode: '',
          expiresAt: '',
          selectedOrganizationId: '',
        },
      };
    }

    const challenge = await createClaimChallenge({
      organizationId: selected.id,
      email: input.email,
    });

    return {
      ok: true,
      data: {
        claimId: challenge.claimId,
        organizations,
        debugCode: challenge.debugCode,
        expiresAt: challenge.expiresAt,
        selectedOrganizationId: selected.id,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Claim failed' };
  }
}

export async function verifyOrgClaimAction(input: {
  claimId: string;
  code: string;
}): Promise<ActionResult<{ organizationId: string; email: string }>> {
  try {
    const data = await verifyClaimChallenge(input);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Verification failed' };
  }
}

export async function completeOrgClaimAction(input: {
  claimId: string;
  password: string;
  displayName?: string;
}): Promise<ActionResult<{ email: string; organizationId: string }>> {
  try {
    const data = await completeOrgClaim(input);
    return {
      ok: true,
      data: { email: data.email, organizationId: data.organizationId },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not finish claim' };
  }
}
