import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatAmount,
  intervalLabel,
  isAllowedAppReturnUrl,
  isAppDeepLinkReturn,
  openAppDeepLink,
  parseCheckoutParams,
  parseCheckoutSource,
  planLabel,
  providerForCurrency,
  sanitizeAppReturnUrl,
} from '@/lib/checkout';

describe('parseCheckoutParams', () => {
  it('parses snake_case and camelCase query keys', () => {
    const params = new URLSearchParams({
      plan_type: 'family',
      billing_interval: 'yearly',
      currency: 'ngn',
      household_id: 'hh-1',
      patient_id: '123456789012',
      return_success: 'caremate://billing/success',
      return_cancel: 'caremate://billing/cancel',
    });

    expect(parseCheckoutParams(params)).toEqual({
      planType: 'family',
      billingInterval: 'yearly',
      currency: 'NGN',
      householdId: 'hh-1',
      patientId: '123456789012',
      returnSuccess: 'caremate://billing/success',
      returnCancel: 'caremate://billing/cancel',
      source: 'app',
    });
  });

  it('accepts alternate key names and defaults currency / deep links', () => {
    const params = new URLSearchParams({
      plan: 'personal',
      interval: 'monthly',
    });

    expect(parseCheckoutParams(params)).toEqual({
      planType: 'personal',
      billingInterval: 'monthly',
      currency: 'USD',
      householdId: null,
      patientId: null,
      returnSuccess: 'caremate://billing/success',
      returnCancel: 'caremate://billing/cancel',
      source: 'app',
    });
  });

  it('replaces unsafe return URLs with billing defaults', () => {
    const params = new URLSearchParams({
      plan_type: 'personal',
      billing_interval: 'monthly',
      return_success: 'javascript:alert(1)',
      return_cancel: 'https://evil.example/phish',
    });

    expect(parseCheckoutParams(params)).toEqual({
      planType: 'personal',
      billingInterval: 'monthly',
      currency: 'USD',
      householdId: null,
      patientId: null,
      returnSuccess: 'caremate://billing/success',
      returnCancel: 'caremate://billing/cancel',
      source: 'app',
    });
  });

  it('rejects invalid plan, interval, and currency', () => {
    expect(parseCheckoutParams(new URLSearchParams({ billing_interval: 'monthly' }))).toEqual({
      error: 'Missing or invalid plan_type (personal | family).',
    });
    expect(
      parseCheckoutParams(new URLSearchParams({ plan_type: 'personal', billing_interval: 'weekly' })),
    ).toEqual({
      error: 'Missing or invalid billing_interval (monthly | yearly).',
    });
    expect(
      parseCheckoutParams(
        new URLSearchParams({
          plan_type: 'personal',
          billing_interval: 'monthly',
          currency: 'EUR',
        }),
      ),
    ).toEqual({
      error: 'Invalid currency (NGN | USD).',
    });
  });
});

describe('return URL allowlist', () => {
  it('allows CareMate billing deep links and getcaremate.com https', () => {
    expect(isAllowedAppReturnUrl('caremate://billing/success')).toBe(true);
    expect(isAllowedAppReturnUrl('caremate://billing/cancel?x=1')).toBe(true);
    expect(isAllowedAppReturnUrl('https://pay.getcaremate.com/success')).toBe(true);
    expect(isAllowedAppReturnUrl('https://pay-dev.getcaremate.com/success')).toBe(true);
    expect(isAllowedAppReturnUrl('https://main.d1wcqa3tsdavz8.amplifyapp.com/success')).toBe(true);
    expect(isAppDeepLinkReturn('caremate://billing/success')).toBe(true);
    expect(isAppDeepLinkReturn('https://www.getcaremate.com/pricing')).toBe(false);
    expect(parseCheckoutSource('website')).toBe('website');
    expect(parseCheckoutSource('community')).toBe('community');
    expect(parseCheckoutSource(null)).toBe('app');
    expect(isAllowedAppReturnUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedAppReturnUrl('caremate://evil')).toBe(false);
    expect(sanitizeAppReturnUrl('javascript:x', 'caremate://billing/success')).toBe(
      'caremate://billing/success',
    );
  });

  it('defaults website and community returns to https hosts, not app deep links', () => {
    const website = parseCheckoutParams(
      new URLSearchParams({
        plan_type: 'personal',
        billing_interval: 'monthly',
        currency: 'NGN',
        source: 'website',
      }),
    );
    expect(website).toMatchObject({
      source: 'website',
      currency: 'NGN',
    });
    if ('error' in website) {
      throw new Error(website.error);
    }
    expect(website.returnSuccess).toMatch(/^https?:\/\//);
    expect(isAppDeepLinkReturn(website.returnSuccess)).toBe(false);

    const community = parseCheckoutParams(
      new URLSearchParams({
        plan: 'family',
        interval: 'yearly',
        source: 'community',
      }),
    );
    expect(community).toMatchObject({ source: 'community', planType: 'family' });
    if ('error' in community) {
      throw new Error(community.error);
    }
    expect(isAppDeepLinkReturn(community.returnCancel)).toBe(false);
  });
});

describe('checkout labels and providers', () => {
  it('maps plan / interval labels and payment provider by currency', () => {
    expect(planLabel('family')).toBe('Family Premium');
    expect(planLabel('personal')).toBe('Standard Premium');
    expect(intervalLabel('yearly')).toBe('Yearly');
    expect(intervalLabel('monthly')).toBe('Monthly');
    expect(providerForCurrency('NGN')).toBe('paystack');
    expect(providerForCurrency('USD')).toBe('stripe');
  });

  it('formats minor units as currency', () => {
    expect(formatAmount(150000, 'NGN')).toMatch(/1,?500/);
    expect(formatAmount(999, 'USD')).toMatch(/9\.99/);
  });

  it('falls back when Intl rejects the currency code', () => {
    const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('bad currency');
    });
    expect(formatAmount(250, 'USD')).toBe('2.5 USD');
    spy.mockRestore();
  });
});

describe('openAppDeepLink', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { href: '' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('assigns the deep link to window.location', () => {
    openAppDeepLink('caremate://billing/success');
    expect(window.location.href).toBe('caremate://billing/success');
  });

  it('ignores unsafe URLs', () => {
    openAppDeepLink('javascript:alert(1)');
    expect(window.location.href).toBe('');
  });
});
