/** SoftLyft admin types for Care Portal org Private Care Team billing (separate from patient Premium). */

export type ProviderOrgPlanTier = 'basic' | 'pro' | 'enterprise';
export type ProviderOrgBillingInterval = 'monthly' | 'yearly';

export type ProviderOrgPlanPrice = {
  id: string;
  plan_tier: 'basic' | 'pro';
  billing_interval: ProviderOrgBillingInterval;
  currency: 'NGN';
  amount_minor: number;
  provider: 'paystack';
  paystack_plan_code: string | null;
  pct_seat_limit: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  video_minutes_included: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderOrgSubscription = {
  id: string;
  organization_id: string;
  plan_tier: ProviderOrgPlanTier;
  billing_interval: ProviderOrgBillingInterval;
  currency: 'NGN';
  provider: 'admin' | 'paystack';
  status: string;
  pct_seat_limit: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  video_minutes_included: number;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_ref: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};
