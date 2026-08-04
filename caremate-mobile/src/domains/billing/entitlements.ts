import type { AdSlotId } from '@/domains/ads/types';
import type { PremiumTier } from '@/domains/billing/types';

/** Active medications allowed on Free (self + children combined). */
export const FREE_MEDICATION_LIMIT = 3;

/** Checkups visible in the current planning year on Free. */
export const FREE_CHECKUP_VISIBLE_COUNT = 2;

/** Immunization schedule visible through this age in weeks on Free (~2 months). */
export const FREE_IMMUNIZATION_MAX_WEEKS = 8;

/** Child profiles allowed on Free and Standard Premium. */
export const FREE_FAMILY_CHILD_LIMIT = 1;

/** Invited adults (excl. owner) allowed on Family Premium. */
export const FAMILY_ADULT_INVITE_LIMIT = 3;

const MINI_APP_AD_FREE_SLOTS: readonly AdSlotId[] = [
  'pregnancy.timeline',
  'pregnancy.footer',
  'period.week',
  'period.footer',
] as const;

export function isPremiumTier(tier: PremiumTier): boolean {
  return tier === 'personal' || tier === 'family';
}

export function hasFamilyPlan(tier: PremiumTier): boolean {
  return tier === 'family';
}

export function canUseMiniApps(isGuest: boolean): boolean {
  return !isGuest;
}

export function countActiveMedications(medications: { active: boolean }[]): number {
  return medications.filter((medication) => medication.active).length;
}

export function canAddMedication(tier: PremiumTier, activeCount: number): boolean {
  if (isPremiumTier(tier)) {
    return true;
  }
  return activeCount < FREE_MEDICATION_LIMIT;
}

/**
 * Whether a medicine may become (or stay) active under Free tier caps.
 * Pausing is always allowed; reactivating counts toward the active limit.
 */
export function canActivateMedication(
  tier: PremiumTier,
  medications: { id: string; active: boolean }[],
  medicationId: string,
  nextActive: boolean,
): boolean {
  if (!nextActive) {
    return true;
  }
  if (isPremiumTier(tier)) {
    return true;
  }
  const current = medications.find((medication) => medication.id === medicationId);
  if (current?.active) {
    return true;
  }
  return countActiveMedications(medications) < FREE_MEDICATION_LIMIT;
}

export function isCheckupYearUnlocked(
  tier: PremiumTier,
  year: number,
  currentYear: number,
): boolean {
  if (isPremiumTier(tier)) {
    return true;
  }
  return year <= currentYear;
}

/**
 * Free unlock uses a stable catalog-order index among the year's eligible
 * items (`CheckupYearItem.stableIndexInYear`), not the display index after
 * status sorting. Completing a free checkup must not unlock the next one.
 */
export function isCheckupItemUnlocked(
  tier: PremiumTier,
  params: { year: number; stableIndexInYear: number; currentYear: number },
): boolean {
  if (isPremiumTier(tier)) {
    return true;
  }
  if (params.year > params.currentYear) {
    return false;
  }
  return params.stableIndexInYear < FREE_CHECKUP_VISIBLE_COUNT;
}

export function isImmunizationScheduleItemUnlocked(
  tier: PremiumTier,
  recommendedAgeWeeks: number,
): boolean {
  if (isPremiumTier(tier)) {
    return true;
  }
  return recommendedAgeWeeks <= FREE_IMMUNIZATION_MAX_WEEKS;
}

export function canAddChild(tier: PremiumTier, currentChildCount: number): boolean {
  if (hasFamilyPlan(tier)) {
    return true;
  }
  return currentChildCount < FREE_FAMILY_CHILD_LIMIT;
}

export function maxChildrenForTier(tier: PremiumTier): number {
  return hasFamilyPlan(tier) ? 12 : FREE_FAMILY_CHILD_LIMIT;
}

/** Plan gate only — Family Premium required to invite adults. */
export function canConnectSpouse(tier: PremiumTier): boolean {
  return hasFamilyPlan(tier);
}

/**
 * Whether the household owner may send another adult invite.
 * `usedSeats` = accepted invited adults (`kind=spouse`) + pending outgoing requests.
 */
export function canInviteFamilyMember(tier: PremiumTier, usedSeats: number): boolean {
  return hasFamilyPlan(tier) && usedSeats < FAMILY_ADULT_INVITE_LIMIT;
}

export function familyAdultInviteSeatsRemaining(usedSeats: number): number {
  return Math.max(0, FAMILY_ADULT_INVITE_LIMIT - usedSeats);
}

export function isMiniAppSlotAdFreeForPremium(tier: PremiumTier, slotId: AdSlotId): boolean {
  if (!isPremiumTier(tier)) {
    return false;
  }
  return MINI_APP_AD_FREE_SLOTS.includes(slotId);
}

export function shouldSuppressAdForUser(
  tier: PremiumTier,
  slotId: AdSlotId,
  isGuest: boolean,
): boolean {
  if (isGuest) {
    return false;
  }
  if (isMiniAppSlotAdFreeForPremium(tier, slotId)) {
    return true;
  }
  return false;
}
