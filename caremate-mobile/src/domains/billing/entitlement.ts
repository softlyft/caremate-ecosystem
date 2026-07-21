/**
 * Premium entitlement helpers and billing repository exports.
 */
export { billingRepository, getPremiumState } from '@/domains/billing/repository';

export { emptyPremiumState, formatPriceAmount, premiumLabel } from '@/domains/billing/format';

export { hydrateAccountEntitlements } from '@/domains/billing/hydrate-entitlements';

export { isLocalEntitlementActive } from '@/domains/billing/period';

export {
  FAMILY_ADULT_INVITE_LIMIT,
  FREE_CHECKUP_VISIBLE_COUNT,
  FREE_FAMILY_CHILD_LIMIT,
  FREE_IMMUNIZATION_MAX_WEEKS,
  FREE_MEDICATION_LIMIT,
  canActivateMedication,
  canAddChild,
  canAddMedication,
  canConnectSpouse,
  canInviteFamilyMember,
  canUseMiniApps,
  countActiveMedications,
  familyAdultInviteSeatsRemaining,
  hasFamilyPlan,
  isCheckupItemUnlocked,
  isCheckupYearUnlocked,
  isImmunizationScheduleItemUnlocked,
  isMiniAppSlotAdFreeForPremium,
  isPremiumTier,
  maxChildrenForTier,
  shouldSuppressAdForUser,
} from '@/domains/billing/entitlements';

export type {
  BillingCurrency,
  BillingInterval,
  BillingProvider,
  PlanType,
  PremiumState,
  PremiumTier,
  SubscriptionPriceRow,
} from '@/domains/billing/types';
