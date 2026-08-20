import { allStoreProductIds, storeProductId } from '@/domains/billing/iap-products';

describe('iap product ids', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('uses CareMate defaults', () => {
    expect(storeProductId('personal', 'monthly')).toBe('caremate.premium.personal.monthly');
    expect(storeProductId('family', 'yearly')).toBe('caremate.premium.family.yearly');
    expect(allStoreProductIds()).toEqual([
      'caremate.premium.personal.monthly',
      'caremate.premium.personal.yearly',
      'caremate.premium.family.monthly',
      'caremate.premium.family.yearly',
    ]);
  });

  it('reads EXPO_PUBLIC_IAP_* overrides', () => {
    process.env.EXPO_PUBLIC_IAP_PERSONAL_YEARLY = 'custom.personal.year';
    expect(storeProductId('personal', 'yearly')).toBe('custom.personal.year');
  });
});
