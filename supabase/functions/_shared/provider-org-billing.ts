import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { periodEndIso } from './supabase.ts';

export type ProviderOrgPlanTier = 'basic' | 'pro';
export type ProviderOrgBillingInterval = 'monthly' | 'yearly';

export type ProviderOrgPaymentRow = {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  plan_price_id: string | null;
  plan_tier: ProviderOrgPlanTier;
  billing_interval: ProviderOrgBillingInterval;
  currency: string;
  provider: 'paystack';
  amount_minor: number;
  status: string;
  provider_reference: string | null;
  pct_seat_limit?: number;
  patient_connection_cap?: number;
  voice_minutes_included?: number;
  video_minutes_included?: number;
};

export type FinalizeProviderOrgPaymentInput = {
  paymentId?: string | null;
  providerReference: string;
  providerTransactionId?: string | null;
  providerCustomerId?: string | null;
  amountMinor?: number | null;
  paidAt?: string;
};

/**
 * Idempotent finalize for Care Portal org Private Care Team payments (Paystack only).
 * Does not touch patient `payments` / `subscriptions`.
 */
export async function finalizeProviderOrgPayment(
  service: SupabaseClient,
  input: FinalizeProviderOrgPaymentInput,
): Promise<{ paymentId: string; subscriptionId: string; alreadyFinalized: boolean }> {
  const now = input.paidAt ?? new Date().toISOString();

  let paymentQuery = service.from('provider_org_payments').select('*');
  if (input.paymentId) {
    paymentQuery = paymentQuery.eq('id', input.paymentId);
  } else {
    paymentQuery = paymentQuery
      .eq('provider', 'paystack')
      .eq('provider_reference', input.providerReference);
  }

  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();
  if (paymentError) throw new Error(paymentError.message);
  if (!payment) throw new Error('Provider org payment not found');

  const row = payment as ProviderOrgPaymentRow & {
    metadata?: Record<string, unknown> | null;
  };

  if (row.status === 'succeeded' && row.subscription_id) {
    return {
      paymentId: row.id,
      subscriptionId: row.subscription_id,
      alreadyFinalized: true,
    };
  }

  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const seatLimit =
    typeof meta.pct_seat_limit === 'number' ? meta.pct_seat_limit : null;
  const patientCap =
    typeof meta.patient_connection_cap === 'number'
      ? meta.patient_connection_cap
      : null;
  const voice =
    typeof meta.voice_minutes_included === 'number'
      ? meta.voice_minutes_included
      : null;
  const video =
    typeof meta.video_minutes_included === 'number'
      ? meta.video_minutes_included
      : null;

  // Load limits from price catalog when metadata incomplete
  let pctSeatLimit = seatLimit ?? (row.plan_tier === 'pro' ? 25 : 7);
  let patientConnectionCap = patientCap ?? (row.plan_tier === 'pro' ? 200 : 50);
  let payerConnectionCap =
    typeof meta.payer_connection_cap === 'number'
      ? meta.payer_connection_cap
      : row.plan_tier === 'pro'
        ? 75
        : 25;
  let voiceMinutes = voice ?? 0;
  let videoMinutes = video ?? 0;

  if (row.plan_price_id) {
    const { data: price } = await service
      .from('provider_org_plan_prices')
      .select(
        'pct_seat_limit, patient_connection_cap, payer_connection_cap, voice_minutes_included, video_minutes_included',
      )
      .eq('id', row.plan_price_id)
      .maybeSingle();
    if (price) {
      pctSeatLimit = Number(price.pct_seat_limit) || pctSeatLimit;
      patientConnectionCap = Number(price.patient_connection_cap) || patientConnectionCap;
      payerConnectionCap = Number(price.payer_connection_cap) || payerConnectionCap;
      voiceMinutes = Number(price.voice_minutes_included) || voiceMinutes;
      videoMinutes = Number(price.video_minutes_included) || videoMinutes;
    }
  }

  const { error: payUpdateError } = await service
    .from('provider_org_payments')
    .update({
      status: 'succeeded',
      provider_reference: input.providerReference,
      provider_transaction_id: input.providerTransactionId ?? null,
      provider_customer_id: input.providerCustomerId ?? null,
      amount_minor: input.amountMinor ?? row.amount_minor,
      paid_at: now,
      updated_at: now,
      failure_reason: null,
    })
    .eq('id', row.id);

  if (payUpdateError) throw new Error(payUpdateError.message);

  const periodEnd = periodEndIso(row.billing_interval, new Date(now));

  // Cancel prior active entitlements for this org
  await service
    .from('provider_org_subscriptions')
    .update({ status: 'canceled', updated_at: now })
    .eq('organization_id', row.organization_id)
    .in('status', ['active', 'trialing']);

  const subscriptionId = crypto.randomUUID();
  const { error: subError } = await service.from('provider_org_subscriptions').insert({
    id: subscriptionId,
    organization_id: row.organization_id,
    plan_tier: row.plan_tier,
    billing_interval: row.billing_interval,
    currency: row.currency,
    provider: 'paystack',
    status: 'active',
    pct_seat_limit: pctSeatLimit,
    patient_connection_cap: patientConnectionCap,
    payer_connection_cap: payerConnectionCap,
    voice_minutes_included: voiceMinutes,
    video_minutes_included: videoMinutes,
    provider_customer_id: input.providerCustomerId ?? null,
    provider_ref: input.providerReference,
    current_period_start: now,
    current_period_end: periodEnd,
    created_at: now,
    updated_at: now,
  });

  if (subError) throw new Error(subError.message);

  await service
    .from('provider_org_payments')
    .update({ subscription_id: subscriptionId, updated_at: now })
    .eq('id', row.id);

  return {
    paymentId: row.id,
    subscriptionId,
    alreadyFinalized: false,
  };
}

export async function markProviderOrgPaymentFailed(
  service: SupabaseClient,
  providerReference: string,
  reason?: string | null,
): Promise<{ paymentId: string | null }> {
  const { data } = await service
    .from('provider_org_payments')
    .select('id, status')
    .eq('provider', 'paystack')
    .eq('provider_reference', providerReference)
    .maybeSingle();

  if (!data?.id || data.status === 'succeeded') {
    return { paymentId: data?.id ?? null };
  }

  await service
    .from('provider_org_payments')
    .update({
      status: 'failed',
      failure_reason: reason ?? 'Paystack charge failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return { paymentId: data.id as string };
}
