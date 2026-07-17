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

export function isCheckupItemUnlocked(
  tier: PremiumTier,
  params: { year: number; indexInYear: number; currentYear: number },
): boolean {
  if (isPremiumTier(tier)) {
    return true;
  }
  if (params.year > params.currentYear) {
    return false;
  }
  return params.indexInYear < FREE_CHECKUP_VISIBLE_COUNT;
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

export function canConnectSpouse(tier: PremiumTier): boolean {
  return hasFamilyPlan(tier);
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
