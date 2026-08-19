import type { BillingInterval, PlanType } from '@/domains/billing/types';

const DEFAULTS: Record<`${PlanType}_${BillingInterval}`, string> = {
  personal_monthly: 'caremate.premium.personal.monthly',
  personal_yearly: 'caremate.premium.personal.yearly',
  family_monthly: 'caremate.premium.family.monthly',
  family_yearly: 'caremate.premium.family.yearly',
};

function envProduct(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

export function storeProductId(planType: PlanType, billingInterval: BillingInterval): string {
  const fallback = DEFAULTS[`${planType}_${billingInterval}`];
  const envKey = `EXPO_PUBLIC_IAP_${planType.toUpperCase()}_${billingInterval.toUpperCase()}`;
  return envProduct(envKey, fallback);
}

export function allStoreProductIds(): string[] {
  return [
    storeProductId('personal', 'monthly'),
    storeProductId('personal', 'yearly'),
    storeProductId('family', 'monthly'),
    storeProductId('family', 'yearly'),
  ];
}
