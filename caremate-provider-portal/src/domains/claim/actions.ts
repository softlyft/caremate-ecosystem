'use server';

import {
  completeOrgClaim,
  createClaimChallenge,
  findClaimableOrgsByEmail,
  verifyClaimChallenge,
} from '@/domains/claim/repository';
import { logError } from '@/lib/observability';
import { getRequestIpHash } from '@/lib/request-ip';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const CLAIM_NO_MATCH_MESSAGE =
  'We could not start a claim for this email. Confirm it matches your CareMate catalog contact, or contact SoftLyft support.';

export async function startOrgClaimAction(input: {
  email: string;
  organizationId?: string;
}): Promise<
  ActionResult<{
    claimId: string;
    organizations: { id: string; name: string }[];
    expiresAt: string;
    selectedOrganizationId: string;
  }>
> {
  try {
    const organizations = await findClaimableOrgsByEmail(input.email);
    if (organizations.length === 0) {
      return {
        ok: false,
        error: CLAIM_NO_MATCH_MESSAGE,
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
          expiresAt: '',
          selectedOrganizationId: '',
        },
      };
    }

    const ipHash = await getRequestIpHash();
    const challenge = await createClaimChallenge({
      organizationId: selected.id,
      email: input.email,
      ipHash,
    });

    return {
      ok: true,
      data: {
        claimId: challenge.claimId,
        organizations,
        expiresAt: challenge.expiresAt,
        selectedOrganizationId: selected.id,
      },
    };
  } catch (err) {
    logError('claim-start', err, { emailDomain: input.email.split('@')[1] ?? null });
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
    logError('claim-verify', err, { claimId: input.claimId });
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
    logError('claim-complete', err, { claimId: input.claimId });
    return { ok: false, error: err instanceof Error ? err.message : 'Could not finish claim' };
  }
}
