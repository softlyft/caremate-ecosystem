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

    // Active Standard members must use create-upgrade for Family (credit + new period).
    if (plan_type === 'family') {
      const { data: personalActive } = await service
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', 'personal')
        .in('status', ['active', 'trialing'])
        .limit(1)
        .maybeSingle();
      if (personalActive) {
        return jsonResponse(
          {
            error:
              'You already have Standard Premium. Use Upgrade to Family to apply your unused credit.',
          },
          400,
        );
      }
    }

    // Block duplicate active entitlement of the same plan type.
    {
      let activeQuery = service
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', plan_type)
        .in('status', ['active', 'trialing'])
        .limit(1);
      const { data: already } = await activeQuery.maybeSingle();
      if (already) {
        return jsonResponse(
          { error: 'You already have an active subscription for this plan.' },
          400,
        );
      }
    }

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

    // Payment row first — subscription is created only after charge succeeds.
    const paymentId = crypto.randomUUID();
    const providerReference = `cm_${paymentId.replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await service.from('payments').insert({
      id: paymentId,
      user_id: user.id,
      household_id: householdId,
      plan_type,
      billing_interval,
      currency,
      provider: price.provider,
      amount_minor: price.amount_minor,
      status: 'pending',
      provider_reference: providerReference,
      metadata: {
        price_id: price.id,
        cancel_url,
        success_url,
      },
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
          reference: providerReference,
          callback_url: success_url,
          metadata: {
            payment_id: paymentId,
            user_id: user.id,
            plan_type,
            billing_interval,
            household_id: householdId ?? '',
            cancel_url,
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
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return jsonResponse({ error: 'Stripe is not configured' }, 500);
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', success_url);
    params.set('cancel_url', cancel_url);
    params.set('client_reference_id', paymentId);
    params.set('customer_email', user.email ?? '');
    params.set('line_items[0][price_data][currency]', 'usd');
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
    params.set('metadata[payment_id]', paymentId);
    params.set('metadata[user_id]', user.id);
    params.set('metadata[plan_type]', plan_type);
    params.set('metadata[billing_interval]', billing_interval);
    params.set('metadata[provider_ref]', providerReference);
    if (householdId) {
      params.set('metadata[household_id]', householdId);
    }
    params.set('subscription_data[metadata][payment_id]', paymentId);
    params.set('subscription_data[metadata][user_id]', user.id);
    params.set('subscription_data[metadata][plan_type]', plan_type);
    params.set('subscription_data[metadata][billing_interval]', billing_interval);
    if (householdId) {
      params.set('subscription_data[metadata][household_id]', householdId);
    }

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
      preview_period_end: periodEndIso(billing_interval),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
