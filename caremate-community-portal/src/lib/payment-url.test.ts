import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCommunityCheckoutUrl } from './payment-url';

describe('buildCommunityCheckoutUrl', () => {
  it('sends plan params and profile return URLs', () => {
    const url = buildCommunityCheckoutUrl({
      paymentUrl: 'https://payment.getcaremate.com',
      appUrl: 'https://community.getcaremate.com',
      planType: 'personal',
      billingInterval: 'yearly',
      currency: 'NGN',
      handoffCode: 'abc',
    });
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://payment.getcaremate.com');
    assert.equal(parsed.searchParams.get('plan_type'), 'personal');
    assert.equal(parsed.searchParams.get('source'), 'community');
    assert.equal(parsed.searchParams.get('handoff'), 'abc');
    assert.equal(
      parsed.searchParams.get('return_success'),
      'https://community.getcaremate.com/app/profile?paid=1',
    );
  });
});
