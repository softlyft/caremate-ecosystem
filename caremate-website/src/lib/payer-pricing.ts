/** Payer org Support Team plans (org billing — separate from provider PCT and consumer Premium). */

export type PayerPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type PayerPlan = {
  id: PayerPlanId;
  name: string;
  tagline: string;
  featured?: boolean;
  monthlyDisplay: string;
  yearlyDisplay: string;
  seats: string;
  patients: string;
  chat: string;
  voice: string;
  proFeatures: string;
  cta: 'claim' | 'upgrade' | 'contact';
};

/** Display prices match SoftLyft admin seed defaults (NGN). Catalog is source of truth at checkout. */
export const PAYER_PLANS: readonly PayerPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Org Messages with connected patients stay free forever.',
    monthlyDisplay: '₦0',
    yearlyDisplay: '₦0',
    seats: '1 Support Team seat',
    patients: '5 approved patients',
    chat: 'Unlimited org chat + Support Team DMs',
    voice: 'No voice calls',
    proFeatures: '—',
    cta: 'claim',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Small payer teams supporting members directly.',
    featured: true,
    monthlyDisplay: '₦12,000',
    yearlyDisplay: '₦120,000',
    seats: '5 Support Team seats',
    patients: '20 approved patients',
    chat: 'Unlimited text chat',
    voice: '100h voice / month (coming soon)',
    proFeatures: '—',
    cta: 'upgrade',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Coordinate care across patients, payers, and providers.',
    monthlyDisplay: '₦38,000',
    yearlyDisplay: '₦380,000',
    seats: '20 Support Team seats',
    patients: '100 approved patients',
    chat: 'Unlimited text chat',
    voice: '250h voice / month (coming soon)',
    proFeatures: 'Group chat (patient + payer + provider); Workflows, Eligibility/Benefits, Claims (future)',
    cta: 'upgrade',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom seats, patients, and integrations.',
    monthlyDisplay: 'Custom',
    yearlyDisplay: 'Custom',
    seats: 'Custom seats',
    patients: 'Custom patient caps',
    chat: 'Unlimited chat',
    voice: 'Custom voice allowance',
    proFeatures: 'Full coordination suite + custom integrations',
    cta: 'contact',
  },
] as const;
