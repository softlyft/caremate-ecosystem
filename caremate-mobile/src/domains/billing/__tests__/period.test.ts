import { isLocalEntitlementActive } from '@/domains/billing/period';

describe('isLocalEntitlementActive', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('grants premium while status is active and period has not ended', () => {
    expect(
      isLocalEntitlementActive({
        status: 'active',
        currentPeriodEnd: '2026-08-17T12:00:00.000Z',
        now,
      }),
    ).toBe(true);
  });

  it('denies premium after local period end even if status is still active', () => {
    expect(
      isLocalEntitlementActive({
        status: 'active',
        currentPeriodEnd: '2026-07-01T12:00:00.000Z',
        now,
      }),
    ).toBe(false);
  });

  it('denies incomplete or canceled rows', () => {
    expect(
      isLocalEntitlementActive({
        status: 'incomplete',
        currentPeriodEnd: '2026-08-17T12:00:00.000Z',
        now,
      }),
    ).toBe(false);
    expect(
      isLocalEntitlementActive({
        status: 'canceled',
        currentPeriodEnd: '2026-08-17T12:00:00.000Z',
        now,
      }),
    ).toBe(false);
  });

  it('denies active rows without a period end (no offline trust)', () => {
    expect(
      isLocalEntitlementActive({
        status: 'active',
        currentPeriodEnd: null,
        now,
      }),
    ).toBe(false);
  });

  it('denies unparseable period ends', () => {
    expect(
      isLocalEntitlementActive({
        status: 'active',
        currentPeriodEnd: 'not-a-date',
        now,
      }),
    ).toBe(false);
  });

  it('allows trialing within period', () => {
    expect(
      isLocalEntitlementActive({
        status: 'trialing',
        currentPeriodEnd: '2026-08-17T12:00:00.000Z',
        now,
      }),
    ).toBe(true);
  });
});
