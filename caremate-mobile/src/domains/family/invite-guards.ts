import type { FamilyLookupUser } from '@/domains/family/types';

export const CANNOT_INVITE_SELF_MESSAGE = 'Cannot connect to yourself';

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  return trimmed.includes('@') ? trimmed : null;
}

function normalizePhoneDigits(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= 3 ? digits : null;
}

/**
 * True when the invite target is the same CareMate account as the sender.
 * Covers matched user id and same email/phone typed into lookup.
 */
export function isFamilySelfInvite(params: {
  fromUserId: string;
  matchedUser?: Pick<FamilyLookupUser, 'userId'> | null;
  lookupQuery?: string | null;
  ownEmail?: string | null;
  ownPhone?: string | null;
}): boolean {
  if (params.matchedUser?.userId && params.matchedUser.userId === params.fromUserId) {
    return true;
  }

  const query = (params.lookupQuery ?? '').trim();
  if (!query || query.length < 3) {
    return false;
  }

  const queryEmail = normalizeEmail(query);
  const ownEmail = normalizeEmail(params.ownEmail);
  if (queryEmail && ownEmail && queryEmail === ownEmail) {
    return true;
  }

  const queryPhone = normalizePhoneDigits(query);
  const ownPhone = normalizePhoneDigits(params.ownPhone);
  if (queryPhone && ownPhone && queryPhone === ownPhone) {
    return true;
  }

  return false;
}

export function assertNotFamilySelfInvite(params: {
  fromUserId: string;
  matchedUser: Pick<FamilyLookupUser, 'userId'>;
}): void {
  if (isFamilySelfInvite(params)) {
    throw new Error(CANNOT_INVITE_SELF_MESSAGE);
  }
}

export function familyConnectionErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/cannot connect to yourself/i.test(message)) {
    return 'family.cannotInviteSelf';
  }
  if (/already in this household/i.test(message)) {
    return 'family.alreadyInHousehold';
  }
  if (/pending invite already exists/i.test(message)) {
    return 'family.pendingInviteExists';
  }
  if (/up to 3 invited members/i.test(message)) {
    return 'family.inviteSeatsFull';
  }
  if (/only the family premium owner/i.test(message)) {
    return 'family.ownerOnlyInvite';
  }
  return 'family.connectionFailedMessage';
}
