/** Consumer (mobile app) launch pricing — CareMate Consumer Pricing Strategy v1. */

export type PricingRegion = 'ng' | 'intl';

export type PlanId = 'free' | 'premium' | 'family';

export type PlanPrice = {
  monthly: string;
  annual: string;
  monthlyNote?: string;
  annualNote?: string;
};

export type ConsumerPlan = {
  id: PlanId;
  name: string;
  tagline: string;
  featured?: boolean;
  prices: Record<PricingRegion, PlanPrice>;
  includesLabel: string;
  features: string[];
};

export const PRICING_REGIONS: {
  id: PricingRegion;
  label: string;
  hint: string;
}[] = [
  {
    id: 'ng',
    label: 'Nigeria',
    hint: 'Billed in Naira',
  },
  {
    id: 'intl',
    label: 'International',
    hint: 'Billed in USD until local pricing launches',
  },
];

export const CONSUMER_PLANS: readonly ConsumerPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Meaningful value to start your CareMate journey.',
    prices: {
      ng: { monthly: '₦0', annual: '₦0' },
      intl: { monthly: '$0', annual: '$0' },
    },
    includesLabel: 'Includes',
    features: [
      'Emergency Profile',
      'Learning',
      'Nearby Providers',
      'Messaging & Broadcasts',
      'Basic Health Records',
      'Vitals Tracker',
      'Medication Assistant',
      'Checkup Planner (partially available)',
      'Immunization Tracker (partially available)',
      'Pregnancy Tracker (partially available)',
      'Period Tracker',
    ],
  },
  {
    id: 'premium',
    name: 'CareMate Premium',
    tagline: 'A smarter, more personalized healthcare experience.',
    featured: true,
    prices: {
      ng: {
        monthly: '₦1,500',
        annual: '₦15,000',
        annualNote: 'About 2 months free',
      },
      intl: {
        monthly: '$2.99',
        annual: '$29.99',
        annualNote: 'About 2 months free',
      },
    },
    includesLabel: 'Everything in Free, plus',
    features: [
      'Family Invitations',
      'Full Checkup Planner',
      'Full Immunization Tracker',
      'Full Pregnancy Tracker',
      'AI Health Companion',
      'Advanced health insights',
      'Unlimited secure medical document storage',
      'Comprehensive health timeline',
      'Health reports and summaries',
      'Priority support',
      'Future premium integrations and intelligence features',
    ],
  },
  {
    id: 'family',
    name: 'CareMate Family',
    tagline: 'Healthcare managed together — the best household value.',
    prices: {
      ng: {
        monthly: '₦4,500',
        annual: '₦45,000',
        annualNote: 'About 2 months free',
      },
      intl: {
        monthly: '$8.99',
        annual: '$89.99',
        annualNote: 'About 2 months free',
      },
    },
    includesLabel: 'Everything in CareMate Premium, plus',
    features: [
      'Up to 4 adult members',
      'Up to 6 children',
      'Shared family health dashboard',
      'Caregiver permissions',
      'Family emergency access',
      'Shared appointments and reminders',
      'Child immunization management',
      'Pregnancy monitoring',
      'Family-wide AI insights (coming soon)',
    ],
  },
] as const;

export const PRICING_PRINCIPLES = [
  {
    title: 'Trust first',
    description: 'Build confidence before maximizing revenue.',
  },
  {
    title: 'Simple to remember',
    description: 'Three clear plans — Free, Premium, and Family.',
  },
  {
    title: 'Annual savings',
    description: 'Yearly billing gives roughly two months free.',
  },
  {
    title: 'Family-friendly',
    description: 'Household care priced for how families actually manage health.',
  },
] as const;

export const PRICING_VALUE_PILLARS = [
  'Peace of mind',
  'Better healthcare coordination',
  'Family health management',
  'Trusted health records',
  'Personalized health intelligence',
] as const;

export type CheckoutPlanType = 'personal' | 'family';
export type CheckoutInterval = 'monthly' | 'yearly';
export type CheckoutCurrency = 'NGN' | 'USD';

export function checkoutPlanType(planId: PlanId): CheckoutPlanType | null {
  if (planId === 'premium') return 'personal';
  if (planId === 'family') return 'family';
  return null;
}

export function checkoutCurrency(region: PricingRegion): CheckoutCurrency {
  return region === 'ng' ? 'NGN' : 'USD';
}

export function checkoutInterval(billing: 'monthly' | 'annual'): CheckoutInterval {
  return billing === 'annual' ? 'yearly' : 'monthly';
}

export function buildCheckoutUrl(input: {
  paymentUrl: string;
  siteUrl: string;
  planType: CheckoutPlanType;
  billingInterval: CheckoutInterval;
  currency: CheckoutCurrency;
}): string {
  const payment = input.paymentUrl.replace(/\/$/, '');
  const site = input.siteUrl.replace(/\/$/, '');
  const query = new URLSearchParams({
    plan_type: input.planType,
    billing_interval: input.billingInterval,
    currency: input.currency,
    source: 'website',
    return_success: `${site}/pricing?paid=1`,
    return_cancel: `${site}/pricing`,
  });
  return `${payment}/?${query.toString()}`;
}

export type SubscriptionPriceRow = {
  plan_type: 'personal' | 'family';
  billing_interval: 'monthly' | 'yearly';
  currency: 'NGN' | 'USD';
  amount_minor: number;
};

export function formatMoneyFromMinor(amountMinor: number, currency: 'NGN' | 'USD'): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}

/** Live `subscription_prices` for marketing display (fallback stays CONSUMER_PLANS). */
export async function fetchActiveSubscriptionPrices(): Promise<SubscriptionPriceRow[]> {
  const { isSupabaseConfigured, supabaseRestHeaders, supabaseRestUrl } = await import(
    '@/lib/supabase'
  );
  if (!isSupabaseConfigured) return [];
  const url = supabaseRestUrl(
    'subscription_prices',
    'is_active=eq.true&select=plan_type,billing_interval,currency,amount_minor&order=plan_type,billing_interval',
  );
  const response = await fetch(url, { headers: supabaseRestHeaders() });
  if (!response.ok) return [];
  return (await response.json()) as SubscriptionPriceRow[];
}

export function liveDisplayAmount(
  rows: SubscriptionPriceRow[],
  planId: PlanId,
  region: PricingRegion,
  billing: 'monthly' | 'annual',
): string | null {
  const planType = checkoutPlanType(planId);
  if (!planType) return null;
  const currency = checkoutCurrency(region);
  const interval = checkoutInterval(billing);
  const row = rows.find(
    (item) =>
      item.plan_type === planType &&
      item.billing_interval === interval &&
      item.currency === currency,
  );
  return row ? formatMoneyFromMinor(row.amount_minor, currency) : null;
}
