import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeUpgradeQuote,
  isSubscriptionPeriodActive,
  isValidPatientId,
  normalizePatientId,
  periodEndIso,
} from './utils';

describe('billing utils', () => {
  it('normalizes and validates 12-digit patient ids', () => {
    assert.equal(normalizePatientId(' 12 3456 789012 '), '123456789012');
    assert.equal(isValidPatientId('123456789012'), true);
    assert.equal(isValidPatientId('123'), false);
    assert.equal(isValidPatientId('abcdefghijkl'), false);
  });

  it('computes monthly and yearly period ends', () => {
    const from = new Date('2026-01-15T12:00:00.000Z');
    assert.equal(periodEndIso('monthly', from), '2026-02-15T12:00:00.000Z');
    assert.equal(periodEndIso('yearly', from), '2027-01-15T12:00:00.000Z');
    // Non-yearly intervals default to +1 month
    assert.equal(periodEndIso('weekly', from), '2026-02-15T12:00:00.000Z');
  });

  it('treats missing period end as still active', () => {
    const now = new Date('2026-07-17T12:00:00.000Z');
    assert.equal(isSubscriptionPeriodActive(null, now), true);
    assert.equal(isSubscriptionPeriodActive(undefined, now), true);
    assert.equal(isSubscriptionPeriodActive('2026-08-01T00:00:00.000Z', now), true);
    assert.equal(isSubscriptionPeriodActive('2026-07-01T00:00:00.000Z', now), false);
  });

  it('computes prorated family upgrade quotes', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const quote = computeUpgradeQuote({
      fromSubscriptionId: 'sub-1',
      personalPeriodStart: '2026-07-01T12:00:00.000Z',
      personalPeriodEnd: '2026-07-31T12:00:00.000Z',
      personalPaidMinor: 3000,
      familyListPriceMinor: 5000,
      familyPriceId: 'price-family',
      billingInterval: 'monthly',
      currency: 'NGN',
      householdId: 'hh-1',
      provider: 'paystack',
      now,
    });
    assert.equal(quote.daysTotal, 30);
    assert.equal(quote.daysRemaining, 15);
    assert.equal(quote.creditMinor, 1500);
    assert.equal(quote.chargeMinor, 3500);
    assert.equal(quote.familyPriceId, 'price-family');
  });

  it('rejects invalid personal periods', () => {
    assert.throws(() =>
      computeUpgradeQuote({
        fromSubscriptionId: 'sub-1',
        personalPeriodStart: 'bad',
        personalPeriodEnd: '2026-07-31T12:00:00.000Z',
        personalPaidMinor: 3000,
        familyListPriceMinor: 5000,
        familyPriceId: 'price-family',
        billingInterval: 'monthly',
        currency: 'USD',
        householdId: 'hh-1',
        provider: 'paystack',
      }),
    );
  });
});
