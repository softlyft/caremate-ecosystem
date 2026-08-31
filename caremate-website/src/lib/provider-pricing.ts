/** Care Portal Private Care Team plans (org billing — separate from consumer Premium). */

export type ProviderPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type ProviderPlan = {
  id: ProviderPlanId;
  name: string;
  tagline: string;
  featured?: boolean;
  monthlyDisplay: string;
  yearlyDisplay: string;
  seats: string;
  patients: string;
  chat: string;
  voiceVideo: string;
  cta: 'claim' | 'upgrade' | 'contact';
};

/** Display prices match SoftLyft admin seed defaults (NGN). Catalog is source of truth at checkout. */
export const PROVIDER_PLANS: readonly ProviderPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Org Messages with connected patients stay free forever.',
    monthlyDisplay: '₦0',
    yearlyDisplay: '₦0',
    seats: '1 Private Care Team seat',
    patients: '5 approved patients',
    chat: 'Unlimited org chat + PCT DMs',
    voiceVideo: 'No voice or video',
    cta: 'claim',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Small clinics that need a named care team.',
    featured: true,
    monthlyDisplay: '₦15,000',
    yearlyDisplay: '₦150,000',
    seats: '5 Private Care Team seats',
    patients: '20 approved patients',
    chat: 'Unlimited chat',
    voiceVideo: '100h call + 100h video / month (coming soon)',
    cta: 'upgrade',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Growing facilities with larger care teams.',
    monthlyDisplay: '₦45,000',
    yearlyDisplay: '₦450,000',
    seats: '20 Private Care Team seats',
    patients: '100 approved patients',
    chat: 'Unlimited chat',
    voiceVideo: '250h call + 250h video / month (coming soon)',
    cta: 'upgrade',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom seats, patients, and support.',
    monthlyDisplay: 'Custom',
    yearlyDisplay: 'Custom',
    seats: 'Custom seats',
    patients: 'Custom patient caps',
    chat: 'Unlimited chat',
    voiceVideo: 'Custom voice / video',
    cta: 'contact',
  },
] as const;
