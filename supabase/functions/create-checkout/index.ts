import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { assertHouseholdMembership } from '../_shared/household.ts';
import { initializePaystackTransaction } from '../_shared/paystack.ts';
import { assertAllowedReturnUrls } from '../_shared/return-url.ts';
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
    if (currency !== 'NGN' && currency !== 'USD') {
      return jsonResponse({ error: 'Invalid currency (NGN | USD)' }, 400);
    }

    try {
      assertAllowedReturnUrls(success_url, cancel_url);
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : 'Invalid return URLs' },
        400,
      );
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
      const { data: already } = await service
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', plan_type)
        .in('status', ['active', 'trialing'])
        .limit(1)
        .maybeSingle();
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
      try {
        await assertHouseholdMembership(service, user.id, householdId);
      } catch (err) {
        return jsonResponse(
          { error: err instanceof Error ? err.message : 'Invalid household' },
          403,
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

    if (price.provider !== 'paystack') {
      return jsonResponse(
        { error: 'Web checkout is Paystack-only. Update the catalog price provider.' },
        500,
      );
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
      provider: 'paystack',
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

    const paystack = await initializePaystackTransaction({
      email: user.email,
      amountMinor: price.amount_minor,
      currency,
      reference: providerReference,
      callbackUrl: success_url,
      metadata: {
        payment_id: paymentId,
        user_id: user.id,
        plan_type,
        billing_interval,
        household_id: householdId ?? '',
        cancel_url,
      },
    });

    if (!paystack.ok) {
      await service
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: paystack.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      return jsonResponse({ error: paystack.message }, 502);
    }

    return jsonResponse({
      url: paystack.authorizationUrl,
      payment_id: paymentId,
      provider: 'paystack',
      reference: providerReference,
      preview_period_end: periodEndIso(billing_interval),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
