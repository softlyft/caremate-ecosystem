import { isAllowedAppReturnUrl, sanitizeAppReturnUrl } from '@/lib/return-url';

export type CheckoutProduct = 'premium' | 'provider_org' | 'payer_org';
export type PlanType = 'personal' | 'family';
export type OrgPlanTier = 'basic' | 'pro';
export type BillingInterval = 'monthly' | 'yearly';
export type BillingCurrency = 'NGN' | 'USD';

export type CheckoutSource =
  | 'app'
  | 'website'
  | 'community'
  | 'care_portal_provider'
  | 'care_portal_payer';

export type PremiumCheckoutParams = {
  product: 'premium';
  planType: PlanType;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
  householdId: string | null;
  patientId: string | null;
  returnSuccess: string;
  returnCancel: string;
  source: CheckoutSource;
};

export type OrgCheckoutParams = {
  product: 'provider_org' | 'payer_org';
  planTier: OrgPlanTier;
  billingInterval: BillingInterval;
  currency: 'NGN';
  organizationId: string;
  returnSuccess: string;
  returnCancel: string;
  source: CheckoutSource;
};

export type CheckoutParams = PremiumCheckoutParams | OrgCheckoutParams;

const PLAN_TYPES = new Set(['personal', 'family']);
const ORG_TIERS = new Set(['basic', 'pro']);
const INTERVALS = new Set(['monthly', 'yearly']);
const CURRENCIES = new Set(['NGN', 'USD']);
const PRODUCTS = new Set(['premium', 'provider_org', 'payer_org']);

const DEFAULT_SUCCESS = 'caremate://billing/success';
const DEFAULT_CANCEL = 'caremate://billing/cancel';

function readParam(search: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = search.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

export function parseCheckoutProduct(raw: string | null): CheckoutProduct {
  if (raw === 'provider_org' || raw === 'payer_org') return raw;
  return 'premium';
}

export function parseCheckoutSource(raw: string | null): CheckoutSource {
  if (
    raw === 'website' ||
    raw === 'community' ||
    raw === 'care_portal_provider' ||
    raw === 'care_portal_payer'
  ) {
    return raw;
  }
  return 'app';
}

function resolveReturnFallbacks(
  source: CheckoutSource,
  product: CheckoutProduct,
): { success: string; cancel: string } {
  if (source === 'community') {
    return { success: communityFallbackUrl('success'), cancel: communityFallbackUrl('cancel') };
  }
  if (source === 'website') {
    return { success: websiteFallbackUrl('success'), cancel: websiteFallbackUrl('cancel') };
  }
  if (source === 'care_portal_provider' || product === 'provider_org') {
    return {
      success: carePortalFallbackUrl('provider', 'success'),
      cancel: carePortalFallbackUrl('provider', 'cancel'),
    };
  }
  if (source === 'care_portal_payer' || product === 'payer_org') {
    return {
      success: carePortalFallbackUrl('payer', 'success'),
      cancel: carePortalFallbackUrl('payer', 'cancel'),
    };
  }
  return { success: DEFAULT_SUCCESS, cancel: DEFAULT_CANCEL };
}

export function parseCheckoutParams(search: URLSearchParams): CheckoutParams | { error: string } {
  const productRaw = readParam(search, ['product']);
  if (productRaw && !PRODUCTS.has(productRaw)) {
    return { error: 'Invalid product (premium | provider_org | payer_org).' };
  }
  const product = parseCheckoutProduct(productRaw);
  const billingInterval = readParam(search, ['billing_interval', 'billingInterval', 'interval']);
  const source = parseCheckoutSource(readParam(search, ['source']));
  const fallbacks = resolveReturnFallbacks(source, product);
  const returnSuccess = sanitizeAppReturnUrl(
    readParam(search, ['return_success', 'success_url']),
    fallbacks.success,
  );
  const returnCancel = sanitizeAppReturnUrl(
    readParam(search, ['return_cancel', 'cancel_url']),
    fallbacks.cancel,
  );

  if (!billingInterval || !INTERVALS.has(billingInterval)) {
    return { error: 'Missing or invalid billing_interval (monthly | yearly).' };
  }

  if (product === 'provider_org' || product === 'payer_org') {
    const planTier = readParam(search, ['plan_tier', 'planTier', 'tier']);
    const organizationId = readParam(search, ['organization_id', 'organizationId', 'org_id']);
    const currency = (readParam(search, ['currency']) ?? 'NGN').toUpperCase();

    if (!planTier || !ORG_TIERS.has(planTier)) {
      return { error: 'Missing or invalid plan_tier (basic | pro).' };
    }
    if (!organizationId) {
      return { error: 'Missing organization_id.' };
    }
    if (currency !== 'NGN') {
      return { error: 'Org checkout currency must be NGN.' };
    }

    return {
      product,
      planTier: planTier as OrgPlanTier,
      billingInterval: billingInterval as BillingInterval,
      currency: 'NGN',
      organizationId,
      returnSuccess,
      returnCancel,
      source,
    };
  }

  const planType = readParam(search, ['plan_type', 'planType', 'plan']);
  const currency = (readParam(search, ['currency']) ?? 'USD').toUpperCase();
  const householdId = readParam(search, ['household_id', 'householdId']);
  const patientId = readParam(search, ['patient_id', 'patientId']);

  if (!planType || !PLAN_TYPES.has(planType)) {
    return { error: 'Missing or invalid plan_type (personal | family).' };
  }
  if (!CURRENCIES.has(currency)) {
    return { error: 'Invalid currency (NGN | USD).' };
  }

  return {
    product: 'premium',
    planType: planType as PlanType,
    billingInterval: billingInterval as BillingInterval,
    currency: currency as BillingCurrency,
    householdId,
    patientId,
    returnSuccess,
    returnCancel,
    source,
  };
}

export function isAppDeepLinkReturn(url: string): boolean {
  return url.trim().toLowerCase().startsWith('caremate://');
}

export function isCarePortalReturn(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/(app|payer)\/settings\/billing/.test(path);
  } catch {
    return false;
  }
}

function trimOrigin(value: string | undefined, fallback: string): string {
  const origin = (value ?? fallback).trim().replace(/\/$/, '');
  return origin || fallback;
}

function websiteFallbackUrl(kind: 'success' | 'cancel'): string {
  const origin = trimOrigin(import.meta.env.VITE_WEBSITE_URL, 'https://getcaremate.com');
  return kind === 'success' ? `${origin}/pricing?paid=1` : `${origin}/pricing`;
}

function communityFallbackUrl(kind: 'success' | 'cancel'): string {
  const origin = trimOrigin(
    import.meta.env.VITE_COMMUNITY_PORTAL_URL,
    'https://community.getcaremate.com',
  );
  return kind === 'success' ? `${origin}/app/profile?paid=1` : `${origin}/app/profile`;
}

function carePortalFallbackUrl(
  kind: 'provider' | 'payer',
  outcome: 'success' | 'cancel',
): string {
  const careOrigin = trimOrigin(
    import.meta.env.VITE_CARE_PORTAL_URL,
    'https://care.getcaremate.com',
  );
  const websiteOrigin = trimOrigin(import.meta.env.VITE_WEBSITE_URL, 'https://getcaremate.com');
  if (kind === 'provider') {
    return outcome === 'success'
      ? `${careOrigin}/app/settings/billing?paid=1`
      : `${websiteOrigin}/providers/pricing`;
  }
  return outcome === 'success'
    ? `${careOrigin}/payer/settings/billing?paid=1`
    : `${websiteOrigin}/payers/pricing`;
}

export function planLabel(planType: PlanType): string {
  return planType === 'family' ? 'Family Premium' : 'Standard Premium';
}

export function orgPlanLabel(tier: OrgPlanTier, product: 'provider_org' | 'payer_org'): string {
  const name = tier === 'pro' ? 'Pro' : 'Basic';
  return product === 'provider_org' ? `Private Care Team · ${name}` : `Support Team · ${name}`;
}

export function intervalLabel(interval: BillingInterval): string {
  return interval === 'yearly' ? 'Yearly' : 'Monthly';
}

export function providerForCurrency(_currency: BillingCurrency): 'paystack' {
  return 'paystack';
}

export function formatAmount(amountMinor: number, currency: BillingCurrency): string {
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

export function openAppDeepLink(url: string) {
  if (!isAllowedAppReturnUrl(url)) {
    return;
  }
  window.location.href = url;
}

export { isAllowedAppReturnUrl, sanitizeAppReturnUrl };
