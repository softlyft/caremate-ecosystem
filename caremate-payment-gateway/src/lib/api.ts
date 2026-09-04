import { supabase } from '@/lib/supabase';
import type { BillingCurrency, BillingInterval, PlanType } from '@/lib/checkout';

export type PriceRow = {
  id: string;
  plan_type: PlanType;
  billing_interval: BillingInterval;
  currency: BillingCurrency;
  amount_minor: number;
  provider: 'paystack';
  is_active: boolean;
};

export async function fetchActivePrice(params: {
  planType: PlanType;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
}): Promise<PriceRow | null> {
  const { data, error } = await supabase
    .from('subscription_prices')
    .select('id, plan_type, billing_interval, currency, amount_minor, provider, is_active')
    .eq('plan_type', params.planType)
    .eq('billing_interval', params.billingInterval)
    .eq('currency', params.currency)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PriceRow;
}

export async function fetchPatientId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('patient_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.patient_id ?? null;
}

export async function startProviderCheckout(input: {
  planType: PlanType;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
  householdId: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; provider: string; payment_id: string; reference: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      plan_type: input.planType,
      billing_interval: input.billingInterval,
      currency: input.currency,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      household_id: input.householdId,
    },
  });

  if (error) {
    throw error;
  }
  if (!data?.url) {
    throw new Error(data?.error ?? 'Checkout did not return a payment URL');
  }

  return data as { url: string; provider: string; payment_id: string; reference: string };
}

export async function verifyCheckout(input: {
  reference?: string | null;
  paymentId?: string | null;
} = {}): Promise<{ status: string; subscriptionId?: string; alreadyFinalized?: boolean }> {
  const body: Record<string, string> = {};
  if (input.paymentId) body.payment_id = input.paymentId;
  if (input.reference) body.reference = input.reference;

  const { data, error } = await supabase.functions.invoke('verify-checkout', { body });
  if (error) throw error;
  if (data?.error) {
    throw new Error(String(data.error));
  }

  return {
    status: String(data?.status ?? 'unknown'),
    subscriptionId: data?.subscription_id ? String(data.subscription_id) : undefined,
    alreadyFinalized: Boolean(data?.already_finalized),
  };
}
