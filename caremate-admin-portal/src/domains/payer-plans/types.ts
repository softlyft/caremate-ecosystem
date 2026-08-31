/** SoftLyft admin types for payer org Support Team billing (separate from provider PCT). */

export type PayerOrgPlanTier = 'basic' | 'pro' | 'enterprise';
export type PayerOrgBillingInterval = 'monthly' | 'yearly';

export type PayerOrgPlanPrice = {
  id: string;
  plan_tier: 'basic' | 'pro';
  billing_interval: PayerOrgBillingInterval;
  currency: 'NGN';
  amount_minor: number;
  provider: 'paystack';
  paystack_plan_code: string | null;
  support_team_seat_limit: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  group_chat_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PayerOrgSubscription = {
  id: string;
  organization_id: string;
  plan_tier: PayerOrgPlanTier;
  billing_interval: PayerOrgBillingInterval;
  currency: 'NGN';
  provider: 'admin' | 'paystack';
  status: string;
  support_team_seat_limit: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  group_chat_enabled: boolean;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_ref: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};
