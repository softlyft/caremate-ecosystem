/**
 * Soft Premium entitlement helpers.
 * Feature locks will wire into these later; for now they power badges and paywall state.
 */
export {
  billingRepository,
  emptyPremiumState,
  formatPriceAmount,
  getPremiumState,
  premiumLabel,
} from '@/domains/billing/repository';

export type {
  BillingCurrency,
  BillingInterval,
  BillingProvider,
  PlanType,
  PremiumState,
  PremiumTier,
  SubscriptionPriceRow,
} from '@/domains/billing/types';
