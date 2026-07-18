import type { PremiumState } from '@/domains/billing/types';

export function emptyPremiumState(): PremiumState {
  return {
    tier: 'free',
    status: null,
    planType: null,
    billingInterval: null,
    currency: null,
    provider: null,
    householdId: null,
    currentPeriodEnd: null,
    subscriptionId: null,
  };
}

export function premiumLabel(tier: PremiumState['tier']): string {
  if (tier === 'personal') return 'Standard Premium';
  if (tier === 'family') return 'Family Premium';
  return 'Free';
}

export function formatPriceAmount(amountMinor: number, currency: string): string {
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
