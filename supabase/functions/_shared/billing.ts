import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { periodEndIso } from './supabase.ts';
import { finalizeFamilyUpgrade } from './upgrade.ts';

export type PlanType = 'personal' | 'family';
export type BillingInterval = 'monthly' | 'yearly';
export type BillingCurrency = 'NGN' | 'USD';
export type BillingProvider = 'paystack' | 'stripe';

export type PaymentRow = {
  id: string;
  user_id: string;
  household_id: string | null;
  subscription_id: string | null;
  plan_type: PlanType;
  billing_interval: BillingInterval;
  currency: BillingCurrency;
  provider: BillingProvider;
  amount_minor: number;
  status: string;
  provider_reference: string;
};

export type FinalizePaymentInput = {
  paymentId?: string | null;
  providerReference: string;
  provider: BillingProvider;
  providerTransactionId?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  amountMinor?: number | null;
  paidAt?: string;
};

/**
 * Idempotent: mark payment succeeded and ensure an active subscription exists.
 * Subscriptions are created only after money is collected.
 */
export async function finalizeSuccessfulPayment(
  service: SupabaseClient,
  input: FinalizePaymentInput,
): Promise<{ paymentId: string; subscriptionId: string; alreadyFinalized: boolean }> {
  const now = input.paidAt ?? new Date().toISOString();

  let paymentQuery = service.from('payments').select('*');
  if (input.paymentId) {
    paymentQuery = paymentQuery.eq('id', input.paymentId);
  } else {
    paymentQuery = paymentQuery
      .eq('provider', input.provider)
      .eq('provider_reference', input.providerReference);
  }

  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();
  if (paymentError) {
    throw new Error(paymentError.message);
  }
  if (!payment) {
    throw new Error('Payment not found for provider reference');
  }

  const row = payment as PaymentRow & { metadata?: Record<string, unknown> | null };

  if (row.status === 'succeeded' && row.subscription_id) {
    return {
      paymentId: row.id,
      subscriptionId: row.subscription_id,
      alreadyFinalized: true,
    };
  }

  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  if (meta.intent === 'upgrade' && typeof meta.upgrade_from_subscription_id === 'string') {
    const householdId =
      typeof meta.household_id === 'string'
        ? meta.household_id
        : row.household_id;
    if (!householdId) {
      throw new Error('Upgrade payment missing household_id');
    }
    return finalizeFamilyUpgrade(service, {
      paymentId: row.id,
      userId: row.user_id,
      fromSubscriptionId: meta.upgrade_from_subscription_id,
      householdId,
      billingInterval: row.billing_interval,
      currency: row.currency,
      provider: row.provider,
      providerReference: input.providerReference,
      providerTransactionId: input.providerTransactionId,
      providerCustomerId: input.providerCustomerId,
      amountMinor: input.amountMinor ?? row.amount_minor,
      paidAt: now,
    });
  }

  const { error: payUpdateError } = await service
    .from('payments')
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

  if (payUpdateError) {
    throw new Error(payUpdateError.message);
  }

  const periodEnd = periodEndIso(row.billing_interval, new Date(now));

  // Prefer renewing an existing active entitlement for the same scope.
  let existingQuery = service
    .from('subscriptions')
    .select('id, current_period_end')
    .eq('user_id', row.user_id)
    .eq('plan_type', row.plan_type)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1);

  if (row.plan_type === 'family') {
    existingQuery = existingQuery.eq('household_id', row.household_id);
  } else {
    existingQuery = existingQuery.is('household_id', null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  let subscriptionId = existing?.id as string | undefined;

  if (subscriptionId) {
    const base =
      existing?.current_period_end && new Date(existing.current_period_end) > new Date(now)
        ? new Date(existing.current_period_end)
        : new Date(now);
    const extendedEnd = periodEndIso(row.billing_interval, base);

    const { error: renewError } = await service
      .from('subscriptions')
      .update({
        status: 'active',
        billing_interval: row.billing_interval,
        currency: row.currency,
        provider: row.provider,
        payment_id: row.id,
        provider_customer_id: input.providerCustomerId ?? null,
        provider_subscription_id: input.providerSubscriptionId ?? null,
        provider_ref: input.providerReference,
        current_period_start: now,
        current_period_end: extendedEnd,
        updated_at: now,
      })
      .eq('id', subscriptionId);

    if (renewError) {
      throw new Error(renewError.message);
    }
  } else {
    subscriptionId = crypto.randomUUID();
    const { error: insertError } = await service.from('subscriptions').insert({
      id: subscriptionId,
      user_id: row.user_id,
      household_id: row.household_id,
      plan_type: row.plan_type,
      billing_interval: row.billing_interval,
      currency: row.currency,
      provider: row.provider,
      status: 'active',
      payment_id: row.id,
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      provider_ref: input.providerReference,
      current_period_start: now,
      current_period_end: periodEnd,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: linkError } = await service
    .from('payments')
    .update({
      subscription_id: subscriptionId,
      updated_at: now,
    })
    .eq('id', row.id);

  if (linkError) {
    throw new Error(linkError.message);
  }

  return {
    paymentId: row.id,
    subscriptionId: subscriptionId!,
    alreadyFinalized: false,
  };
}

export async function markPaymentFailed(
  service: SupabaseClient,
  provider: BillingProvider,
  providerReference: string,
  reason: string,
) {
  const now = new Date().toISOString();
  await service
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: reason,
      updated_at: now,
    })
    .eq('provider', provider)
    .eq('provider_reference', providerReference)
    .eq('status', 'pending');
}
