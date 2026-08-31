import type { SubscriptionPrice } from '@/types/database';

export function formatDisplayAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}

export const SUBSCRIPTION_PLAN_LABEL: Record<string, string> = {
  personal: 'Personal',
  family: 'Family',
};

export const SUBSCRIPTION_PLAN_LABEL_PREMIUM: Record<string, string> = {
  personal: 'Premium Personal',
  family: 'Premium Family',
};

export const BILLING_INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export function subscriptionPriceOptionLabel(
  price: SubscriptionPrice,
  planLabels: Record<string, string> = SUBSCRIPTION_PLAN_LABEL,
) {
  return `${planLabels[price.plan_type] ?? price.plan_type} · ${BILLING_INTERVAL_LABEL[price.billing_interval] ?? price.billing_interval} · ${formatDisplayAmount(price.amount_minor, price.currency)}`;
}
