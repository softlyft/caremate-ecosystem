import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { assertAllowedReturnUrls } from '../_shared/return-url.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type CheckoutBody = {
  organization_id: string;
  plan_tier: 'basic' | 'pro';
  billing_interval: 'monthly' | 'yearly';
  currency?: 'NGN';
  success_url: string;
  cancel_url: string;
};

/**
 * Paystack-only checkout for Care Portal Private Care Team plans.
 * Separate from patient Premium `create-checkout`.
 */
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
    const organizationId = body.organization_id?.trim();
    const planTier = body.plan_tier;
    const billingInterval = body.billing_interval;
    const { success_url, cancel_url } = body;

    if (!organizationId || !planTier || !billingInterval || !success_url || !cancel_url) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    if (planTier !== 'basic' && planTier !== 'pro') {
      return jsonResponse({ error: 'Invalid plan_tier' }, 400);
    }
    if (billingInterval !== 'monthly' && billingInterval !== 'yearly') {
      return jsonResponse({ error: 'Invalid billing_interval' }, 400);
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

    const { data: membership } = await service
      .from('provider_org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    const role = membership?.role as string | undefined;
    const canManage = role === 'owner' || role === 'administrator';
    if (!canManage) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: price, error: priceError } = await service
      .from('provider_org_plan_prices')
      .select('*')
      .eq('plan_tier', planTier)
      .eq('billing_interval', billingInterval)
      .eq('currency', 'NGN')
      .eq('is_active', true)
      .maybeSingle();

    if (priceError || !price) {
      return jsonResponse({ error: 'Price not found or inactive' }, 404);
    }

    const paymentId = crypto.randomUUID();
    const providerReference = `pog_${paymentId.replace(/-/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await service.from('provider_org_payments').insert({
      id: paymentId,
      organization_id: organizationId,
      plan_price_id: price.id,
      plan_tier: planTier,
      billing_interval: billingInterval,
      currency: 'NGN',
      provider: 'paystack',
      amount_minor: price.amount_minor,
      status: 'pending',
      provider_reference: providerReference,
      created_by: user.id,
      metadata: {
        price_id: price.id,
        pct_seat_limit: price.pct_seat_limit,
        patient_connection_cap: price.patient_connection_cap,
        voice_minutes_included: price.voice_minutes_included,
        video_minutes_included: price.video_minutes_included,
        cancel_url,
        success_url,
        product: 'provider_org_private_care_team',
      },
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

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
          organization_id: organizationId,
          plan_tier: planTier,
          billing_interval: billingInterval,
          product: 'provider_org_private_care_team',
          cancel_url,
        },
      }),
    });

    const paystackJson = await paystackRes.json();
    if (!paystackRes.ok || !paystackJson?.status) {
      await service
        .from('provider_org_payments')
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

    const authorizationUrl = paystackJson.data.authorization_url as string;

    return jsonResponse({
      url: authorizationUrl,
      authorization_url: authorizationUrl,
      payment_id: paymentId,
      provider: 'paystack',
      reference: providerReference,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('create-provider-org-checkout', message);
    return jsonResponse({ error: message }, 500);
  }
});
