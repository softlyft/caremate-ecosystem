import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { finalizeSuccessfulPayment } from '../_shared/billing.ts';
import { assertAllowedReturnUrls } from '../_shared/return-url.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';
import { buildFamilyUpgradeQuote } from '../_shared/upgrade.ts';
import type { BillingCurrency, BillingInterval } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as {
      billing_interval?: BillingInterval;
      currency?: BillingCurrency;
      household_id?: string | null;
      success_url?: string;
      cancel_url?: string;
    };

    if (!body.billing_interval || !body.currency || !body.success_url || !body.cancel_url) {
      return jsonResponse(
        { error: 'billing_interval, currency, success_url, and cancel_url are required' },
        400,
      );
    }

    try {
      assertAllowedReturnUrls(body.success_url, body.cancel_url);
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : 'Invalid return URLs' },
        400,
      );
    }

    const service = createServiceClient();
    const quote = await buildFamilyUpgradeQuote(service, {
      userId: user.id,
      billingInterval: body.billing_interval,
      currency: body.currency,
      householdId: body.household_id,
    });

    const paymentId = crypto.randomUUID();
    const providerReference = `cm_up_${paymentId.replace(/-/g, '').slice(0, 20)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await service.from('payments').insert({
      id: paymentId,
      user_id: user.id,
      household_id: quote.householdId,
      plan_type: 'family',
      billing_interval: quote.billingInterval,
      currency: quote.currency,
      provider: quote.provider,
      amount_minor: quote.chargeMinor,
      status: 'pending',
      provider_reference: providerReference,
      metadata: {
        intent: 'upgrade',
        upgrade_from_subscription_id: quote.fromSubscriptionId,
        household_id: quote.householdId,
        credit_minor: quote.creditMinor,
        family_list_price_minor: quote.familyListPriceMinor,
        personal_paid_minor: quote.personalPaidMinor,
        days_remaining: quote.daysRemaining,
        days_total: quote.daysTotal,
        family_price_id: quote.familyPriceId,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
      },
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    // Fully covered by Standard credit — activate immediately.
    if (quote.chargeMinor === 0) {
      const result = await finalizeSuccessfulPayment(service, {
        paymentId,
        providerReference,
        provider: quote.provider,
        amountMinor: 0,
      });
      return jsonResponse({
        url: null,
        charge_minor: 0,
        payment_id: result.paymentId,
        subscription_id: result.subscriptionId,
        quote,
        activated: true,
      });
    }

    if (quote.provider === 'paystack') {
      const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!secret) {
        return jsonResponse({ error: 'Paystack is not configured' }, 500);
      }

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: quote.chargeMinor,
          currency: 'NGN',
          reference: providerReference,
          callback_url: body.success_url,
          metadata: {
            payment_id: paymentId,
            user_id: user.id,
            intent: 'upgrade',
            plan_type: 'family',
            billing_interval: quote.billingInterval,
            household_id: quote.householdId,
            upgrade_from_subscription_id: quote.fromSubscriptionId,
            cancel_url: body.cancel_url,
          },
        }),
      });

      const paystackJson = await paystackRes.json();
      if (!paystackRes.ok || !paystackJson?.status) {
        await service
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: paystackJson?.message ?? 'Paystack initialize failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId);
        return jsonResponse(
          { error: paystackJson?.message ?? 'Paystack initialize failed' },
          502,
        );
      }

      return jsonResponse({
        url: paystackJson.data.authorization_url as string,
        payment_id: paymentId,
        provider: 'paystack',
        reference: providerReference,
        charge_minor: quote.chargeMinor,
        quote,
        activated: false,
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return jsonResponse({ error: 'Stripe is not configured' }, 500);
    }

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', body.success_url);
    params.set('cancel_url', body.cancel_url);
    params.set('client_reference_id', paymentId);
    if (user.email) params.set('customer_email', user.email);
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(quote.chargeMinor));
    params.set(
      'line_items[0][price_data][product_data][name]',
      `CareMate Family upgrade (${quote.billingInterval})`,
    );
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[payment_id]', paymentId);
    params.set('metadata[intent]', 'upgrade');
    params.set('metadata[user_id]', user.id);
    params.set('metadata[upgrade_from_subscription_id]', quote.fromSubscriptionId);
    params.set('metadata[household_id]', quote.householdId);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const stripeJson = await stripeRes.json();
    if (!stripeRes.ok || !stripeJson?.url) {
      await service
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: stripeJson?.error?.message ?? 'Stripe checkout failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      return jsonResponse(
        { error: stripeJson?.error?.message ?? 'Stripe checkout failed' },
        502,
      );
    }

    await service
      .from('payments')
      .update({
        provider_reference: stripeJson.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    return jsonResponse({
      url: stripeJson.url as string,
      payment_id: paymentId,
      provider: 'stripe',
      reference: stripeJson.id as string,
      charge_minor: quote.chargeMinor,
      quote,
      activated: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 400);
  }
});
