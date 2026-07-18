export type PlanType = 'personal' | 'family';
export type BillingInterval = 'monthly' | 'yearly';
export type BillingCurrency = 'NGN' | 'USD';
export type BillingProvider = 'paystack' | 'stripe' | 'admin';
export type PremiumTier = 'free' | 'personal' | 'family';

export type SubscriptionPriceRow = {
  id: string;
  planType: PlanType;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
  amountMinor: number;
  provider: BillingProvider;
  isActive: boolean;
};

export type PremiumState = {
  tier: PremiumTier;
  status: string | null;
  planType: PlanType | null;
  billingInterval: BillingInterval | null;
  currency: BillingCurrency | null;
  provider: BillingProvider | null;
  householdId: string | null;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
};

export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;
