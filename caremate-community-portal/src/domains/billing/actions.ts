'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/site-url';
import { buildCommunityCheckoutUrl, getPaymentUrl } from '@/lib/payment-url';

export type CheckoutPlanType = 'personal' | 'family';
export type CheckoutInterval = 'monthly' | 'yearly';
export type CheckoutCurrency = 'NGN' | 'USD';

export type StartPremiumCheckoutResult = { url: string } | { error: string };

export async function startPremiumCheckout(input: {
  planType: CheckoutPlanType;
  billingInterval: CheckoutInterval;
  currency: CheckoutCurrency;
}): Promise<StartPremiumCheckoutResult> {
  if (
    (input.planType !== 'personal' && input.planType !== 'family') ||
    (input.billingInterval !== 'monthly' && input.billingInterval !== 'yearly') ||
    (input.currency !== 'NGN' && input.currency !== 'USD')
  ) {
    return { error: 'Invalid plan selection.' };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Sign in to subscribe.' };
  }

  const paymentBase = getPaymentUrl();
  const appBase = getAppUrl();
  let handoffCode: string | null = null;
  if (session.refresh_token) {
    const { data, error } = await supabase.functions.invoke('create-checkout-handoff', {
      body: { refresh_token: session.refresh_token },
    });
    if (!error && typeof data?.code === 'string' && data.code.trim()) {
      handoffCode = data.code.trim();
    }
  }

  return {
    url: buildCommunityCheckoutUrl({
      paymentUrl: paymentBase,
      appUrl: appBase,
      planType: input.planType,
      billingInterval: input.billingInterval,
      currency: input.currency,
      handoffCode,
    }),
  };
}
