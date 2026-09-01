/** Payer org Support Team plans (org billing — separate from provider PCT and consumer Premium). */

import { orgPlanFallbackPrices } from '@/lib/ngn-pricing';

const PAYER_BASIC_FALLBACK = orgPlanFallbackPrices(75_000);
const PAYER_PRO_FALLBACK = orgPlanFallbackPrices(165_000);

export type PayerPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type PayerPlan = {
  id: PayerPlanId;
  name: string;
  tagline: string;
  featured?: boolean;
  monthlyDisplay: string;
  yearlyDisplay: string;
  seats: string;
  providers: string;
  patients: string;
  cta: 'claim' | 'upgrade' | 'contact';
};

/** Static plan coverage; paid amounts are hydrated from `payer_org_plan_prices`. */
export const PAYER_PLAN_SHELLS: readonly PayerPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Org Messages with connected patients stay free forever.',
    monthlyDisplay: '₦0',
    yearlyDisplay: '₦0',
    seats: '2 support team seats (including admin)',
    providers: '3 active provider connections',
    patients: '7 active patient connections',
    cta: 'claim',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Small payer teams supporting members directly.',
    featured: true,
    monthlyDisplay: PAYER_BASIC_FALLBACK.monthlyDisplay,
    yearlyDisplay: PAYER_BASIC_FALLBACK.yearlyDisplay,
    seats: 'Up to 7 support team seats (including admin)',
    providers: '25 active provider connections',
    patients: '100 active patient connections',
    cta: 'upgrade',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Coordinate care across patients, payers, and providers.',
    monthlyDisplay: PAYER_PRO_FALLBACK.monthlyDisplay,
    yearlyDisplay: PAYER_PRO_FALLBACK.yearlyDisplay,
    seats: 'Up to 25 support team seats (including admin)',
    providers: '75 active provider connections',
    patients: '250 active patient connections',
    cta: 'upgrade',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'More than Pro — reach out to the CareMate team.',
    monthlyDisplay: 'Custom',
    yearlyDisplay: 'Custom',
    seats: 'More than Pro',
    providers: 'More than Pro',
    patients: 'More than Pro',
    cta: 'contact',
  },
] as const;

/** Offline fallback when the catalog cannot be loaded. */
export const PAYER_PLANS = PAYER_PLAN_SHELLS;
