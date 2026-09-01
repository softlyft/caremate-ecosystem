/** Care Portal Private Care Team plans (org billing — separate from consumer Premium). */

import { orgPlanFallbackPrices } from '@/lib/ngn-pricing';

const PROVIDER_BASIC_FALLBACK = orgPlanFallbackPrices(45_000);
const PROVIDER_PRO_FALLBACK = orgPlanFallbackPrices(120_000);

export type ProviderPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type ProviderPlan = {
  id: ProviderPlanId;
  name: string;
  tagline: string;
  featured?: boolean;
  monthlyDisplay: string;
  yearlyDisplay: string;
  seats: string;
  payers: string;
  patients: string;
  cta: 'claim' | 'upgrade' | 'contact';
};

/** Static plan coverage; paid amounts are hydrated from `provider_org_plan_prices`. */
export const PROVIDER_PLAN_SHELLS: readonly ProviderPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Org Messages with connected patients stay free forever.',
    monthlyDisplay: '₦0',
    yearlyDisplay: '₦0',
    seats: '2 care team seats (including admin)',
    payers: '3 payer connections',
    patients: '20 active patient connections',
    cta: 'claim',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Small clinics that need a named care team.',
    featured: true,
    monthlyDisplay: PROVIDER_BASIC_FALLBACK.monthlyDisplay,
    yearlyDisplay: PROVIDER_BASIC_FALLBACK.yearlyDisplay,
    seats: 'Up to 7 care team seats (including admin)',
    payers: '25 active payer connections',
    patients: '50 active patient connections',
    cta: 'upgrade',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Growing facilities with larger care teams.',
    monthlyDisplay: PROVIDER_PRO_FALLBACK.monthlyDisplay,
    yearlyDisplay: PROVIDER_PRO_FALLBACK.yearlyDisplay,
    seats: 'Up to 25 care team seats (including admin)',
    payers: '75 active payer connections',
    patients: '200 active patient connections',
    cta: 'upgrade',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'More than Pro — reach out to the CareMate team.',
    monthlyDisplay: 'Custom',
    yearlyDisplay: 'Custom',
    seats: 'More than Pro',
    payers: 'More than Pro',
    patients: 'More than Pro',
    cta: 'contact',
  },
] as const;

/** Offline fallback when the catalog cannot be loaded. */
export const PROVIDER_PLANS = PROVIDER_PLAN_SHELLS;
