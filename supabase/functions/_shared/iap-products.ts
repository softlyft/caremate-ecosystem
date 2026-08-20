import type { BillingInterval, PlanType } from './billing.ts';

export type StoreProvider = 'apple' | 'google';

const DEFAULT_PRODUCTS: Record<`${PlanType}_${BillingInterval}`, string> = {
  personal_monthly: 'caremate.premium.personal.monthly',
  personal_yearly: 'caremate.premium.personal.yearly',
  family_monthly: 'caremate.premium.family.monthly',
  family_yearly: 'caremate.premium.family.yearly',
};

function envProduct(key: string, fallback: string): string {
  const value = Deno.env.get(key)?.trim();
  return value || fallback;
}

export function storeProductId(planType: PlanType, billingInterval: BillingInterval): string {
  const fallback = DEFAULT_PRODUCTS[`${planType}_${billingInterval}`];
  const envKey = `IAP_PRODUCT_${planType.toUpperCase()}_${billingInterval.toUpperCase()}`;
  return envProduct(envKey, fallback);
}

export function planFromProductId(
  productId: string,
): { planType: PlanType; billingInterval: BillingInterval } | null {
  const normalized = productId.trim();
  for (const planType of ['personal', 'family'] as const) {
    for (const billingInterval of ['monthly', 'yearly'] as const) {
      if (storeProductId(planType, billingInterval) === normalized) {
        return { planType, billingInterval };
      }
    }
  }
  return null;
}
