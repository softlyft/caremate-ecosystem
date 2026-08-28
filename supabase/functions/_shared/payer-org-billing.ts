import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { periodEndIso } from './supabase.ts';

export type PayerOrgPlanTier = 'basic' | 'pro';
export type PayerOrgBillingInterval = 'monthly' | 'yearly';

export type PayerOrgPaymentRow = {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  plan_price_id: string | null;
  plan_tier: PayerOrgPlanTier;
  billing_interval: PayerOrgBillingInterval;
  currency: string;
  provider: 'paystack';
  amount_minor: number;
  status: string;
  provider_reference: string | null;
};

export type FinalizePayerOrgPaymentInput = {
  paymentId?: string | null;
  providerReference: string;
  providerTransactionId?: string | null;
  providerCustomerId?: string | null;
  amountMinor?: number | null;
  paidAt?: string;
};

/**
 * Idempotent finalize for payer org Support Team payments (Paystack only).
 */
export async function finalizePayerOrgPayment(
  service: SupabaseClient,
  input: FinalizePayerOrgPaymentInput,
): Promise<{ paymentId: string; subscriptionId: string; alreadyFinalized: boolean }> {
  const now = input.paidAt ?? new Date().toISOString();

  let paymentQuery = service.from('payer_org_payments').select('*');
  if (input.paymentId) {
    paymentQuery = paymentQuery.eq('id', input.paymentId);
  } else {
    paymentQuery = paymentQuery
      .eq('provider', 'paystack')
      .eq('provider_reference', input.providerReference);
  }

  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();
  if (paymentError) throw new Error(paymentError.message);
  if (!payment) throw new Error('Payer org payment not found');

  const row = payment as PayerOrgPaymentRow & {
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
    typeof meta.support_team_seat_limit === 'number' ? meta.support_team_seat_limit : null;
  const patientCap =
    typeof meta.patient_connection_cap === 'number' ? meta.patient_connection_cap : null;
  const voice =
    typeof meta.voice_minutes_included === 'number' ? meta.voice_minutes_included : null;
  const groupChat =
    typeof meta.group_chat_enabled === 'boolean' ? meta.group_chat_enabled : null;

  let supportTeamSeatLimit = seatLimit ?? (row.plan_tier === 'pro' ? 20 : 5);
  let patientConnectionCap = patientCap ?? (row.plan_tier === 'pro' ? 100 : 20);
  let voiceMinutes = voice ?? (row.plan_tier === 'pro' ? 15000 : 6000);
  let groupChatEnabled = groupChat ?? row.plan_tier === 'pro';

  if (row.plan_price_id) {
    const { data: price } = await service
      .from('payer_org_plan_prices')
      .select(
        'support_team_seat_limit, patient_connection_cap, voice_minutes_included, group_chat_enabled',
      )
      .eq('id', row.plan_price_id)
      .maybeSingle();
    if (price) {
      supportTeamSeatLimit = Number(price.support_team_seat_limit) || supportTeamSeatLimit;
      patientConnectionCap = Number(price.patient_connection_cap) || patientConnectionCap;
      voiceMinutes = Number(price.voice_minutes_included) || voiceMinutes;
      groupChatEnabled = Boolean(price.group_chat_enabled);
    }
  }

  const { error: payUpdateError } = await service
    .from('payer_org_payments')
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

  await service
    .from('payer_org_subscriptions')
    .update({ status: 'canceled', updated_at: now })
    .eq('organization_id', row.organization_id)
    .in('status', ['active', 'trialing']);

  const subscriptionId = crypto.randomUUID();
  const { error: subError } = await service.from('payer_org_subscriptions').insert({
    id: subscriptionId,
    organization_id: row.organization_id,
    plan_tier: row.plan_tier,
    billing_interval: row.billing_interval,
    currency: row.currency,
    provider: 'paystack',
    status: 'active',
    support_team_seat_limit: supportTeamSeatLimit,
    patient_connection_cap: patientConnectionCap,
    voice_minutes_included: voiceMinutes,
    group_chat_enabled: groupChatEnabled,
    provider_customer_id: input.providerCustomerId ?? null,
    provider_ref: input.providerReference,
    current_period_start: now,
    current_period_end: periodEnd,
    created_at: now,
    updated_at: now,
  });

  if (subError) throw new Error(subError.message);

  await service
    .from('payer_org_payments')
    .update({ subscription_id: subscriptionId, updated_at: now })
    .eq('id', row.id);

  return {
    paymentId: row.id,
    subscriptionId,
    alreadyFinalized: false,
  };
}

export async function markPayerOrgPaymentFailed(
  service: SupabaseClient,
  providerReference: string,
  reason?: string | null,
): Promise<{ paymentId: string | null }> {
  const { data } = await service
    .from('payer_org_payments')
    .select('id, status')
    .eq('provider', 'paystack')
    .eq('provider_reference', providerReference)
    .maybeSingle();

  if (!data?.id || data.status === 'succeeded') {
    return { paymentId: data?.id ?? null };
  }

  await service
    .from('payer_org_payments')
    .update({
      status: 'failed',
      failure_reason: reason ?? 'Paystack charge failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return { paymentId: data.id as string };
}
