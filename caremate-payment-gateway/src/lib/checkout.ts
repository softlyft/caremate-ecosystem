import { isAllowedAppReturnUrl, sanitizeAppReturnUrl } from '@/lib/return-url';

export type PlanType = 'personal' | 'family';
export type BillingInterval = 'monthly' | 'yearly';
export type BillingCurrency = 'NGN' | 'USD';

export type CheckoutParams = {
  planType: PlanType;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
  householdId: string | null;
  patientId: string | null;
  returnSuccess: string;
  returnCancel: string;
};

const PLAN_TYPES = new Set(['personal', 'family']);
const INTERVALS = new Set(['monthly', 'yearly']);
const CURRENCIES = new Set(['NGN', 'USD']);

const DEFAULT_SUCCESS = 'caremate://billing/success';
const DEFAULT_CANCEL = 'caremate://billing/cancel';

function readParam(search: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = search.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

export function parseCheckoutParams(search: URLSearchParams): CheckoutParams | { error: string } {
  const planType = readParam(search, ['plan_type', 'planType', 'plan']);
  const billingInterval = readParam(search, ['billing_interval', 'billingInterval', 'interval']);
  const currency = (readParam(search, ['currency']) ?? 'USD').toUpperCase();
  const householdId = readParam(search, ['household_id', 'householdId']);
  const patientId = readParam(search, ['patient_id', 'patientId']);
  const returnSuccess = sanitizeAppReturnUrl(
    readParam(search, ['return_success', 'success_url']),
    DEFAULT_SUCCESS,
  );
  const returnCancel = sanitizeAppReturnUrl(
    readParam(search, ['return_cancel', 'cancel_url']),
    DEFAULT_CANCEL,
  );

  if (!planType || !PLAN_TYPES.has(planType)) {
    return { error: 'Missing or invalid plan_type (personal | family).' };
  }
  if (!billingInterval || !INTERVALS.has(billingInterval)) {
    return { error: 'Missing or invalid billing_interval (monthly | yearly).' };
  }
  if (!CURRENCIES.has(currency)) {
    return { error: 'Invalid currency (NGN | USD).' };
  }

  return {
    planType: planType as PlanType,
    billingInterval: billingInterval as BillingInterval,
    currency: currency as BillingCurrency,
    householdId,
    patientId,
    returnSuccess,
    returnCancel,
  };
}

export function planLabel(planType: PlanType): string {
  return planType === 'family' ? 'Family Premium' : 'Standard Premium';
}

export function intervalLabel(interval: BillingInterval): string {
  return interval === 'yearly' ? 'Yearly' : 'Monthly';
}

export function providerForCurrency(currency: BillingCurrency): 'paystack' | 'stripe' {
  return currency === 'NGN' ? 'paystack' : 'stripe';
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
