import type { FamilyMemberKind } from '@/domains/family/types';

type MembershipRef = {
  kind: FamilyMemberKind | string;
  householdId: string;
};

/**
 * Pick which household membership is "active" for Family UI + Family Premium.
 *
 * After accepting an invite, a user may still have a leftover solo `self` row and a new
 * invited-adult `spouse` row. Prefer the joined household so shared children and the
 * owner's Family Premium entitlement resolve on the invitee device.
 */
export function selectActiveHouseholdId(memberships: MembershipRef[]): string | null {
  if (memberships.length === 0) {
    return null;
  }

  const invited = memberships.find((member) => member.kind === 'spouse');
  if (invited?.householdId) {
    return invited.householdId;
  }

  const self = memberships.find((member) => member.kind === 'self');
  if (self?.householdId) {
    return self.householdId;
  }

  return memberships[0]?.householdId ?? null;
}
