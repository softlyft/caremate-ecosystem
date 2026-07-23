import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { assertHouseholdMembership } from './household.ts';
import { periodEndIso } from './supabase.ts';
import type { BillingCurrency, BillingInterval } from './billing.ts';

const MS_PER_DAY = 86_400_000;

export type UpgradeQuote = {
  fromSubscriptionId: string;
  daysTotal: number;
  daysRemaining: number;
  personalPaidMinor: number;
  creditMinor: number;
  familyListPriceMinor: number;
  chargeMinor: number;
  currency: BillingCurrency;
  billingInterval: BillingInterval;
  householdId: string;
  newPeriodStart: string;
  newPeriodEnd: string;
  provider: 'paystack' | 'stripe';
  familyPriceId: string;
};

export function computeUpgradeQuote(params: {
  fromSubscriptionId: string;
  personalPeriodStart: string;
  personalPeriodEnd: string;
  personalPaidMinor: number;
  familyListPriceMinor: number;
  familyPriceId: string;
  billingInterval: BillingInterval;
  currency: BillingCurrency;
  householdId: string;
  provider: 'paystack' | 'stripe';
  now?: Date;
}): UpgradeQuote {
  const now = params.now ?? new Date();
  const startMs = Date.parse(params.personalPeriodStart);
  const endMs = Date.parse(params.personalPeriodEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error('Invalid personal subscription period');
  }

  const daysTotal = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const daysRemaining = Math.max(0, Math.round((endMs - now.getTime()) / MS_PER_DAY));
  const creditMinor = Math.floor((params.personalPaidMinor * daysRemaining) / daysTotal);
  const chargeMinor = Math.max(0, params.familyListPriceMinor - creditMinor);

  return {
    fromSubscriptionId: params.fromSubscriptionId,
    daysTotal,
    daysRemaining,
    personalPaidMinor: params.personalPaidMinor,
    creditMinor,
    familyListPriceMinor: params.familyListPriceMinor,
    chargeMinor,
    currency: params.currency,
    billingInterval: params.billingInterval,
    householdId: params.householdId,
    newPeriodStart: now.toISOString(),
    newPeriodEnd: periodEndIso(params.billingInterval, now),
    provider: params.provider,
    familyPriceId: params.familyPriceId,
  };
}

/** Resolve paid amount for the personal sub (linked payment, else catalog). */
export async function resolvePersonalPaidMinor(
  service: SupabaseClient,
  subscription: {
    id: string;
    payment_id: string | null;
    plan_type: string;
    billing_interval: string;
    currency: string;
  },
): Promise<number> {
  if (subscription.payment_id) {
    const { data: payment } = await service
      .from('payments')
      .select('amount_minor, status')
      .eq('id', subscription.payment_id)
      .maybeSingle();
    if (payment && payment.status === 'succeeded' && typeof payment.amount_minor === 'number') {
      return payment.amount_minor;
    }
  }

  const { data: linked } = await service
    .from('payments')
    .select('amount_minor')
    .eq('subscription_id', subscription.id)
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linked && typeof linked.amount_minor === 'number') {
    return linked.amount_minor;
  }

  const { data: price } = await service
    .from('subscription_prices')
    .select('amount_minor')
    .eq('plan_type', subscription.plan_type)
    .eq('billing_interval', subscription.billing_interval)
    .eq('currency', subscription.currency)
    .eq('is_active', true)
    .maybeSingle();

  if (!price) {
    throw new Error('Could not resolve Standard plan price for credit');
  }
  return price.amount_minor as number;
}

export async function buildFamilyUpgradeQuote(
  service: SupabaseClient,
  params: {
    userId: string;
    billingInterval: BillingInterval;
    currency: BillingCurrency;
    householdId?: string | null;
    now?: Date;
  },
): Promise<UpgradeQuote> {
  const { data: personal, error: personalError } = await service
    .from('subscriptions')
    .select('*')
    .eq('user_id', params.userId)
    .eq('plan_type', 'personal')
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (personalError) throw new Error(personalError.message);
  if (!personal) {
    throw new Error('No active Standard subscription to upgrade');
  }
  if (!personal.current_period_start || !personal.current_period_end) {
    throw new Error('Standard subscription is missing period dates');
  }
  if (new Date(personal.current_period_end).getTime() <= (params.now ?? new Date()).getTime()) {
    throw new Error('Standard subscription has ended — buy Family normally');
  }

  let householdId = params.householdId ?? null;
  if (!householdId) {
    const { data: membership } = await service
      .from('family_members')
      .select('household_id')
      .eq('linked_user_id', params.userId)
      .limit(1)
      .maybeSingle();
    householdId = membership?.household_id ?? null;
  }
  if (!householdId) {
    throw new Error('Family plan requires a household. Set up family profiles first.');
  }

  await assertHouseholdMembership(service, params.userId, householdId);

  const { data: familyPrice, error: priceError } = await service
    .from('subscription_prices')
    .select('*')
    .eq('plan_type', 'family')
    .eq('billing_interval', params.billingInterval)
    .eq('currency', params.currency)
    .eq('is_active', true)
    .maybeSingle();

  if (priceError || !familyPrice) {
    throw new Error('Family price not found or inactive');
  }

  const personalPaidMinor = await resolvePersonalPaidMinor(service, personal);

  return computeUpgradeQuote({
    fromSubscriptionId: personal.id,
    personalPeriodStart: personal.current_period_start,
    personalPeriodEnd: personal.current_period_end,
    personalPaidMinor,
    familyListPriceMinor: familyPrice.amount_minor,
    familyPriceId: familyPrice.id,
    billingInterval: params.billingInterval,
    currency: params.currency,
    householdId,
    provider: familyPrice.provider as 'paystack' | 'stripe',
    now: params.now,
  });
}

/**
 * After upgrade payment succeeds (or zero-charge): cancel Standard, activate Family from today.
 */
export async function finalizeFamilyUpgrade(
  service: SupabaseClient,
  params: {
    paymentId: string;
    userId: string;
    fromSubscriptionId: string;
    householdId: string;
    billingInterval: BillingInterval;
    currency: BillingCurrency;
    provider: string;
    providerReference: string;
    providerTransactionId?: string | null;
    providerCustomerId?: string | null;
    amountMinor: number;
    paidAt?: string;
  },
): Promise<{ paymentId: string; subscriptionId: string; alreadyFinalized: boolean }> {
  const now = params.paidAt ?? new Date().toISOString();

  const { data: payment } = await service
    .from('payments')
    .select('*')
    .eq('id', params.paymentId)
    .maybeSingle();

  if (!payment) {
    throw new Error('Upgrade payment not found');
  }

  if (payment.status === 'succeeded' && payment.subscription_id) {
    return {
      paymentId: payment.id,
      subscriptionId: payment.subscription_id as string,
      alreadyFinalized: true,
    };
  }

  const { error: payUpdateError } = await service
    .from('payments')
    .update({
      status: 'succeeded',
      provider_transaction_id: params.providerTransactionId ?? null,
      provider_customer_id: params.providerCustomerId ?? null,
      amount_minor: params.amountMinor,
      paid_at: now,
      updated_at: now,
      failure_reason: null,
    })
    .eq('id', params.paymentId);

  if (payUpdateError) throw new Error(payUpdateError.message);

  // Cancel Standard (and any other personal active rows for this user).
  await service
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: now,
      provider_ref: `upgraded_to_family:${params.paymentId}`,
    })
    .eq('user_id', params.userId)
    .eq('plan_type', 'personal')
    .in('status', ['active', 'trialing', 'past_due']);

  // Ensure no active family already (shouldn't happen).
  const { data: existingFamily } = await service
    .from('subscriptions')
    .select('id')
    .eq('user_id', params.userId)
    .eq('plan_type', 'family')
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingFamily) {
    throw new Error('User already has an active Family subscription');
  }

  const subscriptionId = crypto.randomUUID();
  const periodEnd = periodEndIso(params.billingInterval, new Date(now));

  const { error: insertError } = await service.from('subscriptions').insert({
    id: subscriptionId,
    user_id: params.userId,
    household_id: params.householdId,
    plan_type: 'family',
    billing_interval: params.billingInterval,
    currency: params.currency,
    provider: params.provider,
    status: 'active',
    payment_id: params.paymentId,
    provider_customer_id: params.providerCustomerId ?? null,
    provider_subscription_id: null,
    provider_ref: params.providerReference,
    current_period_start: now,
    current_period_end: periodEnd,
    created_at: now,
    updated_at: now,
  });

  if (insertError) throw new Error(insertError.message);

  await service
    .from('payments')
    .update({
      subscription_id: subscriptionId,
      updated_at: now,
    })
    .eq('id', params.paymentId);

  return {
    paymentId: params.paymentId,
    subscriptionId,
    alreadyFinalized: false,
  };
}
