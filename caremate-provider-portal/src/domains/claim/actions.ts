'use server';

import { cookies } from 'next/headers';

import {
  completeOrgClaim,
  createClaimChallenge,
  findClaimableOrgsForKind,
  verifyClaimChallenge,
  type CareOrgKind,
} from '@/domains/claim/repository';
import { CARE_ACTIVE_KIND_COOKIE } from '@/constants/cookies';
import { logError } from '@/lib/observability';
import { getRequestIpHash } from '@/lib/request-ip';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const CLAIM_NO_MATCH_MESSAGE =
  'We could not start a claim for this email. Confirm it matches your CareMate catalog contact, or contact SoftLyft support.';

function parseOrgKind(value: unknown): CareOrgKind {
  return value === 'payer' ? 'payer' : 'provider';
}

export async function startOrgClaimAction(input: {
  email: string;
  organizationId?: string;
  orgKind?: CareOrgKind;
}): Promise<
  ActionResult<{
    claimId: string;
    organizations: { id: string; name: string }[];
    expiresAt: string;
    selectedOrganizationId: string;
    orgKind: CareOrgKind;
  }>
> {
  const orgKind = parseOrgKind(input.orgKind);
  try {
    const organizations = await findClaimableOrgsForKind(orgKind, input.email);
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
          orgKind,
        },
      };
    }

    const ipHash = await getRequestIpHash();
    const challenge = await createClaimChallenge({
      organizationId: selected.id,
      email: input.email,
      orgKind,
      ipHash,
    });

    return {
      ok: true,
      data: {
        claimId: challenge.claimId,
        organizations,
        expiresAt: challenge.expiresAt,
        selectedOrganizationId: selected.id,
        orgKind,
      },
    };
  } catch (err) {
    logError('claim-start', err, {
      emailDomain: input.email.split('@')[1] ?? null,
      orgKind,
    });
    return { ok: false, error: err instanceof Error ? err.message : 'Claim failed' };
  }
}

export async function verifyOrgClaimAction(input: {
  claimId: string;
  code: string;
  orgKind?: CareOrgKind;
}): Promise<ActionResult<{ organizationId: string; email: string }>> {
  const orgKind = parseOrgKind(input.orgKind);
  try {
    const data = await verifyClaimChallenge({ ...input, orgKind });
    return { ok: true, data };
  } catch (err) {
    logError('claim-verify', err, { claimId: input.claimId, orgKind });
    return { ok: false, error: err instanceof Error ? err.message : 'Verification failed' };
  }
}

export async function completeOrgClaimAction(input: {
  claimId: string;
  password: string;
  displayName?: string;
  orgKind?: CareOrgKind;
}): Promise<ActionResult<{ email: string; organizationId: string; orgKind: CareOrgKind }>> {
  const orgKind = parseOrgKind(input.orgKind);
  try {
    const data = await completeOrgClaim({ ...input, orgKind });
    const cookieStore = await cookies();
    cookieStore.set(CARE_ACTIVE_KIND_COOKIE, data.orgKind, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });
    return {
      ok: true,
      data: {
        email: data.email,
        organizationId: data.organizationId,
        orgKind: data.orgKind,
      },
    };
  } catch (err) {
    logError('claim-complete', err, { claimId: input.claimId, orgKind });
    return { ok: false, error: err instanceof Error ? err.message : 'Could not finish claim' };
  }
}
