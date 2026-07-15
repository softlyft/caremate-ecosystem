import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient, periodEndIso } from '../_shared/supabase.ts';

type CheckoutBody = {
  plan_type: 'personal' | 'family';
  billing_interval: 'monthly' | 'yearly';
  currency: 'NGN' | 'USD';
  success_url: string;
  cancel_url: string;
  household_id?: string | null;
};

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

    const body = (await req.json()) as CheckoutBody;
    const { plan_type, billing_interval, currency, success_url, cancel_url } = body;
    if (!plan_type || !billing_interval || !currency || !success_url || !cancel_url) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const service = createServiceClient();

    let householdId: string | null = null;
    if (plan_type === 'family') {
      householdId = body.household_id ?? null;
      if (!householdId) {
        const { data: membership } = await service
          .from('family_members')
          .select('household_id')
          .eq('linked_user_id', user.id)
          .limit(1)
          .maybeSingle();
        householdId = membership?.household_id ?? null;
      }
      if (!householdId) {
        return jsonResponse(
          { error: 'Family plan requires a household. Set up family profiles first.' },
          400,
        );
      }
    }

    const { data: price, error: priceError } = await service
      .from('subscription_prices')
      .select('*')
      .eq('plan_type', plan_type)
      .eq('billing_interval', billing_interval)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (priceError || !price) {
      return jsonResponse({ error: 'Price not found or inactive' }, 404);
    }

    const subscriptionId = crypto.randomUUID();
    const providerRef = `cm_${subscriptionId.replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await service.from('subscriptions').insert({
      id: subscriptionId,
      user_id: user.id,
      household_id: householdId,
      plan_type,
      billing_interval,
      currency,
      provider: price.provider,
      status: 'incomplete',
      provider_ref: providerRef,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    if (price.provider === 'paystack') {
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
          amount: price.amount_minor,
          currency: 'NGN',
          reference: providerRef,
          callback_url: success_url,
          metadata: {
            subscription_id: subscriptionId,
            user_id: user.id,
            plan_type,
            billing_interval,
            household_id: householdId,
            cancel_url,
          },
        }),
      });

      const paystackJson = await paystackRes.json();
      if (!paystackRes.ok || !paystackJson?.status) {
        return jsonResponse(
          { error: paystackJson?.message ?? 'Paystack initialize failed' },
          502,
        );
      }

      return jsonResponse({
        url: paystackJson.data.authorization_url as string,
        subscription_id: subscriptionId,
        provider: 'paystack',
        reference: providerRef,
      });
    }

    // Stripe hosted Checkout (subscription with price_data)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return jsonResponse({ error: 'Stripe is not configured' }, 500);
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', success_url);
    params.set('cancel_url', cancel_url);
    params.set('client_reference_id', subscriptionId);
    params.set('customer_email', user.email ?? '');
    params.set(
      'line_items[0][price_data][currency]',
      'usd',
    );
    params.set('line_items[0][price_data][unit_amount]', String(price.amount_minor));
    params.set(
      'line_items[0][price_data][product_data][name]',
      `CareMate Premium ${plan_type} (${billing_interval})`,
    );
    params.set(
      'line_items[0][price_data][recurring][interval]',
      billing_interval === 'yearly' ? 'year' : 'month',
    );
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[subscription_id]', subscriptionId);
    params.set('metadata[user_id]', user.id);
    params.set('metadata[plan_type]', plan_type);
    params.set('metadata[billing_interval]', billing_interval);
    params.set('metadata[provider_ref]', providerRef);
    if (householdId) {
      params.set('metadata[household_id]', householdId);
    }
    params.set('subscription_data[metadata][subscription_id]', subscriptionId);
    params.set('subscription_data[metadata][user_id]', user.id);
    params.set('subscription_data[metadata][plan_type]', plan_type);
    params.set('subscription_data[metadata][billing_interval]', billing_interval);
    params.set('subscription_data[metadata][provider_ref]', providerRef);
    if (householdId) {
      params.set('subscription_data[metadata][household_id]', householdId);
    }

    // Avoid empty customer_email param
    if (!user.email) {
      params.delete('customer_email');
    }

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
      return jsonResponse(
        { error: stripeJson?.error?.message ?? 'Stripe checkout failed' },
        502,
      );
    }

    await service
      .from('subscriptions')
      .update({
        provider_ref: stripeJson.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    return jsonResponse({
      url: stripeJson.url as string,
      subscription_id: subscriptionId,
      provider: 'stripe',
      reference: stripeJson.id as string,
      // Helper for local testing of period math when webhooks are delayed
      preview_period_end: periodEndIso(billing_interval),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
