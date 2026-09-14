import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildCarePortalOrgCheckoutUrl, getPaymentUrl } from '@/lib/payment-url';

describe('buildCarePortalOrgCheckoutUrl', () => {
  it('builds a payment-gateway URL for provider org checkout (not Paystack)', () => {
    const url = buildCarePortalOrgCheckoutUrl({
      paymentUrl: 'https://pay.getcaremate.com',
      careUrl: 'https://care.getcaremate.com',
      websiteUrl: 'https://www.getcaremate.com',
      product: 'provider_org',
      organizationId: 'org-123',
      planTier: 'basic',
      billingInterval: 'monthly',
      handoffCode: 'abc',
    });

    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://pay.getcaremate.com');
    assert.equal(parsed.searchParams.get('product'), 'provider_org');
    assert.equal(parsed.searchParams.get('organization_id'), 'org-123');
    assert.equal(parsed.searchParams.get('plan_tier'), 'basic');
    assert.equal(parsed.searchParams.get('currency'), 'NGN');
    assert.equal(parsed.searchParams.get('source'), 'care_portal_provider');
    assert.equal(parsed.searchParams.get('handoff'), 'abc');
    assert.match(parsed.searchParams.get('return_success') ?? '', /\/app\/settings\/billing/);
    assert.equal(/paystack/i.test(parsed.href), false);
  });

  it('builds payer org checkout with payer return paths', () => {
    const url = buildCarePortalOrgCheckoutUrl({
      paymentUrl: 'https://pay.getcaremate.com/',
      careUrl: 'https://care.getcaremate.com/',
      websiteUrl: 'https://www.getcaremate.com/',
      product: 'payer_org',
      organizationId: 'payer-1',
      planTier: 'pro',
      billingInterval: 'yearly',
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('product'), 'payer_org');
    assert.equal(parsed.searchParams.get('source'), 'care_portal_payer');
    assert.match(parsed.searchParams.get('return_success') ?? '', /\/payer\/settings\/billing/);
    assert.match(parsed.searchParams.get('return_cancel') ?? '', /\/payers\/pricing/);
  });
});

describe('getPaymentUrl', () => {
  it('strips trailing slash from env default', () => {
    assert.equal(getPaymentUrl().endsWith('/'), false);
  });
});
