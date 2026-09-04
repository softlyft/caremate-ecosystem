import {
  BILLING_CURRENCY_BY_COUNTRY,
  DEFAULT_BILLING_CURRENCY,
  billingCurrencyForCountry,
  billingProviderForCurrency,
} from '@/domains/billing/currency-by-country';

describe('billingCurrencyForCountry', () => {
  it('defaults to USD for unknown, empty, and Global', () => {
    expect(DEFAULT_BILLING_CURRENCY).toBe('USD');
    expect(billingCurrencyForCountry(null)).toBe('USD');
    expect(billingCurrencyForCountry(undefined)).toBe('USD');
    expect(billingCurrencyForCountry('')).toBe('USD');
    expect(billingCurrencyForCountry('INT')).toBe('USD');
    expect(billingCurrencyForCountry('US')).toBe('USD');
    expect(billingCurrencyForCountry('GB')).toBe('USD');
    expect(billingCurrencyForCountry('GH')).toBe('USD');
  });

  it('uses NGN for Nigeria', () => {
    expect(BILLING_CURRENCY_BY_COUNTRY.NG).toBe('NGN');
    expect(billingCurrencyForCountry('NG')).toBe('NGN');
    expect(billingCurrencyForCountry('ng')).toBe('NGN');
    expect(billingCurrencyForCountry(' Ng ')).toBe('NGN');
  });

  it('maps currency to the matching gateway', () => {
    expect(billingProviderForCurrency('NGN')).toBe('paystack');
    expect(billingProviderForCurrency('USD')).toBe('paystack');
  });
});
