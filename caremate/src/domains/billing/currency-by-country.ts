import type { BillingCurrency, BillingProvider } from '@/domains/billing/types';

/**
 * Default checkout currency for any country not listed in
 * {@link BILLING_CURRENCY_BY_COUNTRY}.
 *
 * Change this (or add a country override below) to retarget payments —
 * no Premium UI changes required.
 */
export const DEFAULT_BILLING_CURRENCY: BillingCurrency = 'USD';

/**
 * Per-country billing currency overrides (ISO 3166-1 alpha-2).
 *
 * Examples:
 * - Move Nigeria to Stripe USD: delete or comment out `NG: 'NGN'`
 * - Charge Ghana in NGN later: add `GH: 'NGN'` (only if catalog + gateway support it)
 */
export const BILLING_CURRENCY_BY_COUNTRY: Readonly<Record<string, BillingCurrency>> = {
  NG: 'NGN',
};

/** Currency → gateway. Catalog rows must match (NGN+paystack, USD+stripe). */
const PROVIDER_BY_CURRENCY: Readonly<Record<BillingCurrency, Exclude<BillingProvider, 'admin'>>> = {
  NGN: 'paystack',
  USD: 'stripe',
};

/**
 * Resolve the checkout currency for a profile / device country code.
 * Unknown, empty, and `INT` (Global) use {@link DEFAULT_BILLING_CURRENCY}.
 */
export function billingCurrencyForCountry(
  countryCode: string | null | undefined,
): BillingCurrency {
  const code = countryCode?.trim().toUpperCase();
  if (!code || code === 'INT') {
    return DEFAULT_BILLING_CURRENCY;
  }
  return BILLING_CURRENCY_BY_COUNTRY[code] ?? DEFAULT_BILLING_CURRENCY;
}

export function billingProviderForCurrency(
  currency: BillingCurrency,
): Exclude<BillingProvider, 'admin'> {
  return PROVIDER_BY_CURRENCY[currency] ?? PROVIDER_BY_CURRENCY[DEFAULT_BILLING_CURRENCY];
}
