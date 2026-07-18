import { emptyPremiumState, formatPriceAmount, premiumLabel } from '@/domains/billing/format';

describe('billing format helpers', () => {
  it('returns empty free premium state', () => {
    expect(emptyPremiumState()).toEqual({
      tier: 'free',
      status: null,
      planType: null,
      billingInterval: null,
      currency: null,
      provider: null,
      householdId: null,
      currentPeriodEnd: null,
      subscriptionId: null,
    });
  });

  it('labels tiers for display', () => {
    expect(premiumLabel('personal')).toBe('Standard Premium');
    expect(premiumLabel('family')).toBe('Family Premium');
    expect(premiumLabel('free')).toBe('Free');
  });

  it('formats minor currency amounts', () => {
    expect(formatPriceAmount(1999, 'USD')).toMatch(/19\.99/);
    expect(formatPriceAmount(50000, 'NGN')).toMatch(/500/);
  });

  it('falls back when currency code is invalid', () => {
    expect(formatPriceAmount(250, 'NOT_A_CURRENCY')).toBe('2.5 NOT_A_CURRENCY');
  });
});
