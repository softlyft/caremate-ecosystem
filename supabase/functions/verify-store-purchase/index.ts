import { finalizeSuccessfulPayment, type BillingCurrency } from '../_shared/billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendBillingActivatedEmail } from '../_shared/email.ts';
import { assertHouseholdMembership } from '../_shared/household.ts';
import { planFromProductId } from '../_shared/iap-products.ts';
import { verifyAppleTransaction } from '../_shared/apple-app-store.ts';
import { verifyGoogleSubscription } from '../_shared/google-play.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type Body = {
  platform?: 'ios' | 'android';
  product_id?: string;
  transaction_id?: string | null;
  purchase_token?: string | null;
  signed_transaction?: string | null;
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

    const body = (await req.json()) as Body;
    const platform = body.platform;
    const productId = body.product_id?.trim() ?? '';
    if (platform !== 'ios' && platform !== 'android') {
      return jsonResponse({ error: 'platform must be ios or android' }, 400);
    }
    if (!productId) {
      return jsonResponse({ error: 'product_id is required' }, 400);
    }

    const mapped = planFromProductId(productId);
    if (!mapped) {
      return jsonResponse({ error: 'Unknown store product' }, 400);
    }

    const service = createServiceClient();
    const provider = platform === 'ios' ? 'apple' : 'google';
    let providerReference = '';
    let expiresAt: string | null = null;

    if (platform === 'ios') {
      const apple = await verifyAppleTransaction({
        transactionId: body.transaction_id,
        signedTransaction: body.signed_transaction ?? body.purchase_token,
      });
      if (apple.productId && apple.productId !== productId) {
        return jsonResponse({ error: 'Apple product does not match the request' }, 400);
      }
      providerReference = apple.originalTransactionId || apple.transactionId;
      expiresAt = apple.expiresDate;
    } else {
      const token = body.purchase_token?.trim();
      if (!token) {
        return jsonResponse({ error: 'purchase_token is required for Android' }, 400);
      }
      const google = await verifyGoogleSubscription({ productId, purchaseToken: token });
      if (google.productId && google.productId !== productId) {
        return jsonResponse({ error: 'Google product does not match the request' }, 400);
      }
      providerReference = google.purchaseToken;
      expiresAt = google.expiryTime;
    }

    if (!providerReference) {
      return jsonResponse({ error: 'Store purchase reference missing' }, 400);
    }

    let householdId: string | null = null;
    let upgradeFromSubscriptionId: string | null = null;
    if (mapped.planType === 'family') {
      householdId = body.household_id?.trim() || null;
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

      const { data: personal } = await service
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_type', 'personal')
        .in('status', ['active', 'trialing'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      upgradeFromSubscriptionId = personal?.id ?? null;
    }

    const { data: existingPayment } = await service
      .from('payments')
      .select('id, status, subscription_id')
      .eq('provider', provider)
      .eq('provider_reference', providerReference)
      .maybeSingle();

    if (existingPayment?.status === 'succeeded' && existingPayment.subscription_id) {
      return jsonResponse({
        status: 'succeeded',
        payment_id: existingPayment.id,
        subscription_id: existingPayment.subscription_id,
        already_finalized: true,
      });
    }

    const currency: BillingCurrency = 'USD';
    const now = new Date().toISOString();
    const paymentId = existingPayment?.id ?? crypto.randomUUID();
    const metadata: Record<string, unknown> = { product_id: productId, platform };
    if (upgradeFromSubscriptionId && householdId) {
      metadata.intent = 'upgrade';
      metadata.upgrade_from_subscription_id = upgradeFromSubscriptionId;
      metadata.household_id = householdId;
    }

    if (!existingPayment) {
      const { error: insertError } = await service.from('payments').insert({
        id: paymentId,
        user_id: user.id,
        household_id: householdId,
        plan_type: mapped.planType,
        billing_interval: mapped.billingInterval,
        currency,
        provider,
        amount_minor: 0,
        status: 'pending',
        provider_reference: providerReference,
        metadata,
        created_at: now,
        updated_at: now,
      });
      if (insertError) {
        return jsonResponse({ error: insertError.message }, 500);
      }
    } else if (upgradeFromSubscriptionId && householdId) {
      await service
        .from('payments')
        .update({ metadata, household_id: householdId, updated_at: now })
        .eq('id', paymentId);
    }

    const result = await finalizeSuccessfulPayment(service, {
      paymentId,
      providerReference,
      provider,
    });

    if (expiresAt) {
      await service
        .from('subscriptions')
        .update({ current_period_end: expiresAt, updated_at: new Date().toISOString() })
        .eq('id', result.subscriptionId);
    }

    if (!result.alreadyFinalized) {
      await sendBillingActivatedEmail(service, {
        userId: user.id,
        paymentId: result.paymentId,
        subscriptionId: result.subscriptionId,
        planType: mapped.planType,
        periodEnd: expiresAt,
      });
    }

    return jsonResponse({
      status: 'succeeded',
      payment_id: result.paymentId,
      subscription_id: result.subscriptionId,
      already_finalized: result.alreadyFinalized,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('verify-store-purchase', message);
    return jsonResponse({ error: message }, 500);
  }
});
