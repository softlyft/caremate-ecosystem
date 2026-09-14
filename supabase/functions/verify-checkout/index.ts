import { finalizeSuccessfulPayment, type BillingInterval, type PlanType } from '../_shared/billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendBillingActivatedEmail } from '../_shared/email.ts';
import {
  finalizePayerOrgPayment,
} from '../_shared/payer-org-billing.ts';
import {
  finalizeProviderOrgPayment,
} from '../_shared/provider-org-billing.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type PaystackVerifyData = {
  status: string;
  reference: string;
  id?: number | string;
  amount?: number;
  currency?: string;
  customer?: { customer_code?: string };
  metadata?: Record<string, unknown>;
};

async function verifyPaystackReference(
  reference: string,
): Promise<{ ok: true; data: PaystackVerifyData } | { ok: false; error: string }> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) {
    return { ok: false, error: 'Paystack is not configured' };
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson?.status) {
    return { ok: false, error: verifyJson?.message ?? 'Paystack verify failed' };
  }

  return { ok: true, data: verifyJson.data as PaystackVerifyData };
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const value = meta?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function isProviderOrgReference(reference: string): boolean {
  return reference.startsWith('pog_');
}

function isPayerOrgReference(reference: string): boolean {
  return reference.startsWith('pyo_');
}

async function respondAfterFinalize(
  service: ReturnType<typeof createServiceClient>,
  result: { paymentId: string; subscriptionId: string; alreadyFinalized: boolean },
  extra: Record<string, unknown> = {},
) {
  if (!result.alreadyFinalized) {
    const { data: payment } = await service
      .from('payments')
      .select('user_id, plan_type')
      .eq('id', result.paymentId)
      .maybeSingle();
    const { data: sub } = await service
      .from('subscriptions')
      .select('current_period_end')
      .eq('id', result.subscriptionId)
      .maybeSingle();
    if (payment?.user_id) {
      await sendBillingActivatedEmail(service, {
        userId: payment.user_id as string,
        paymentId: result.paymentId,
        subscriptionId: result.subscriptionId,
        planType: (payment.plan_type as string) ?? 'personal',
        periodEnd: (sub?.current_period_end as string | null) ?? null,
      });
    }
  }
  return jsonResponse({
    status: 'succeeded',
    payment_id: result.paymentId,
    subscription_id: result.subscriptionId,
    already_finalized: result.alreadyFinalized,
    ...extra,
  });
}

async function userCanAccessProviderOrgPayment(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  payment: { created_by?: string | null; organization_id: string },
): Promise<boolean> {
  if (payment.created_by && payment.created_by === userId) return true;
  const { data: membership } = await service
    .from('provider_org_members')
    .select('role')
    .eq('organization_id', payment.organization_id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  const role = membership?.role as string | undefined;
  return role === 'owner' || role === 'administrator';
}

async function userCanAccessPayerOrgPayment(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  payment: { created_by?: string | null; organization_id: string },
): Promise<boolean> {
  if (payment.created_by && payment.created_by === userId) return true;
  const { data: membership } = await service
    .from('payer_org_members')
    .select('role')
    .eq('organization_id', payment.organization_id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  const role = membership?.role as string | undefined;
  return role === 'owner' || role === 'administrator';
}

async function verifyAndFinalizeOrgPayment(params: {
  service: ReturnType<typeof createServiceClient>;
  userId: string;
  reference: string;
  kind: 'provider' | 'payer';
}) {
  const { service, userId, reference, kind } = params;
  const table = kind === 'provider' ? 'provider_org_payments' : 'payer_org_payments';
  const { data: payment, error } = await service
    .from(table)
    .select('*')
    .eq('provider_reference', reference)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!payment) {
    return jsonResponse({ error: 'Organization payment not found.' }, 404);
  }

  const allowed =
    kind === 'provider'
      ? await userCanAccessProviderOrgPayment(service, userId, payment as {
          created_by?: string | null;
          organization_id: string;
        })
      : await userCanAccessPayerOrgPayment(service, userId, payment as {
          created_by?: string | null;
          organization_id: string;
        });
  if (!allowed) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (payment.status === 'succeeded' && payment.subscription_id) {
    return jsonResponse({
      status: 'succeeded',
      payment_id: payment.id,
      subscription_id: payment.subscription_id,
      already_finalized: true,
      product: kind === 'provider' ? 'provider_org' : 'payer_org',
    });
  }

  const verified = await verifyPaystackReference(reference);
  if (!verified.ok) {
    return jsonResponse({ error: verified.error }, 502);
  }
  if (verified.data.status !== 'success') {
    return jsonResponse({
      status: verified.data.status ?? 'pending',
      payment_id: payment.id,
      message: 'Payment not successful yet',
      product: kind === 'provider' ? 'provider_org' : 'payer_org',
    });
  }

  const finalizeInput = {
    paymentId: String(payment.id),
    providerReference: String(verified.data.reference ?? reference),
    providerTransactionId: verified.data.id != null ? String(verified.data.id) : null,
    providerCustomerId: verified.data.customer?.customer_code ?? null,
    amountMinor: typeof verified.data.amount === 'number' ? verified.data.amount : null,
  };

  const result =
    kind === 'provider'
      ? await finalizeProviderOrgPayment(service, finalizeInput)
      : await finalizePayerOrgPayment(service, finalizeInput);

  return jsonResponse({
    status: 'succeeded',
    payment_id: result.paymentId,
    subscription_id: result.subscriptionId,
    already_finalized: result.alreadyFinalized,
    product: kind === 'provider' ? 'provider_org' : 'payer_org',
  });
}

/**
 * Client-side fallback after hosted checkout returns to the app / payment gateway.
 * Confirms the charge with Paystack, then creates the subscription / org entitlement.
 *
 * Routes by payment reference prefix:
 * - `pog_` → provider org Private Care Team
 * - `pyo_` → payer org Support Team
 * - else → patient Premium (`payments` / `subscriptions`)
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

    const body = (await req.json()) as {
      reference?: string;
      payment_id?: string;
    };

    const service = createServiceClient();
    const reference = body.reference?.trim() || null;
    const paymentId = body.payment_id?.trim() || null;

    if (reference && isProviderOrgReference(reference)) {
      return await verifyAndFinalizeOrgPayment({
        service,
        userId: user.id,
        reference,
        kind: 'provider',
      });
    }
    if (reference && isPayerOrgReference(reference)) {
      return await verifyAndFinalizeOrgPayment({
        service,
        userId: user.id,
        reference,
        kind: 'payer',
      });
    }

    let payment: Record<string, unknown> | null = null;

    if (paymentId) {
      const { data, error } = await service
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', paymentId)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      payment = data;
    } else if (reference) {
      const { data, error } = await service
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_reference', reference)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      payment = data;
    } else {
      const { data, error } = await service
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      payment = data;
    }

    // Legacy recovery: paid via old create-checkout (subscription row, no payments row)
    if (!payment && reference) {
      const verified = await verifyPaystackReference(reference);
      if (!verified.ok) {
        return jsonResponse({ error: verified.error }, 502);
      }
      if (verified.data.status !== 'success') {
        return jsonResponse({
          status: verified.data.status ?? 'pending',
          message: 'Payment not successful yet',
        });
      }

      const meta = verified.data.metadata ?? {};
      const metaUserId = metaString(meta, 'user_id');
      if (metaUserId && metaUserId !== user.id) {
        return jsonResponse({ error: 'Payment does not belong to this user' }, 403);
      }

      const planType = (metaString(meta, 'plan_type') ?? 'personal') as PlanType;
      const billingInterval = (metaString(meta, 'billing_interval') ?? 'monthly') as BillingInterval;
      const householdRaw = metaString(meta, 'household_id');
      const householdId = householdRaw && householdRaw.length > 0 ? householdRaw : null;

      const newPaymentId = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error: insertError } = await service.from('payments').insert({
        id: newPaymentId,
        user_id: user.id,
        household_id: planType === 'family' ? householdId : null,
        plan_type: planType,
        billing_interval: billingInterval,
        currency: 'NGN',
        provider: 'paystack',
        amount_minor: typeof verified.data.amount === 'number' ? verified.data.amount : 0,
        status: 'pending',
        provider_reference: reference,
        metadata: { recovered: true, legacy_subscription_id: metaString(meta, 'subscription_id') },
        created_at: now,
        updated_at: now,
      });
      if (insertError) {
        return jsonResponse({ error: insertError.message }, 500);
      }

      const result = await finalizeSuccessfulPayment(service, {
        paymentId: newPaymentId,
        providerReference: reference,
        provider: 'paystack',
        providerTransactionId:
          verified.data.id != null ? String(verified.data.id) : null,
        providerCustomerId: verified.data.customer?.customer_code ?? null,
        amountMinor: typeof verified.data.amount === 'number' ? verified.data.amount : null,
      });

      return respondAfterFinalize(service, result, { recovered: true });
    }

    if (!payment) {
      return jsonResponse(
        {
          error:
            'Payment not found. Open Premium and pull to refresh, or complete checkout again.',
        },
        404,
      );
    }

    if (payment.status === 'succeeded' && payment.subscription_id) {
      return jsonResponse({
        status: 'succeeded',
        payment_id: payment.id,
        subscription_id: payment.subscription_id,
        already_finalized: true,
      });
    }

    if (payment.provider === 'paystack') {
      const verified = await verifyPaystackReference(String(payment.provider_reference));
      if (!verified.ok) {
        return jsonResponse({ error: verified.error }, 502);
      }
      if (verified.data.status !== 'success') {
        return jsonResponse({
          status: verified.data.status ?? 'pending',
          payment_id: payment.id,
          message: 'Payment not successful yet',
        });
      }

      const result = await finalizeSuccessfulPayment(service, {
        paymentId: String(payment.id),
        providerReference: String(verified.data.reference ?? payment.provider_reference),
        provider: 'paystack',
        providerTransactionId:
          verified.data.id != null ? String(verified.data.id) : null,
        providerCustomerId: verified.data.customer?.customer_code ?? null,
        amountMinor: typeof verified.data.amount === 'number' ? verified.data.amount : null,
      });

      return respondAfterFinalize(service, result);
    }

    // Legacy Stripe Checkout sessions (pre Paystack-USD cutover). New checkouts are Paystack-only.
    if (payment.provider === 'stripe') {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) {
        return jsonResponse({ error: 'Legacy Stripe payment cannot be verified' }, 500);
      }

      const sessionRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(String(payment.provider_reference))}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );
      const session = await sessionRes.json();
      if (!sessionRes.ok) {
        return jsonResponse(
          { error: session?.error?.message ?? 'Stripe session lookup failed' },
          502,
        );
      }

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return jsonResponse({
          status: session.payment_status ?? session.status ?? 'pending',
          payment_id: payment.id,
          message: 'Payment not successful yet',
        });
      }

      const result = await finalizeSuccessfulPayment(service, {
        paymentId: String(payment.id),
        providerReference: session.id as string,
        provider: 'stripe',
        providerTransactionId: session.payment_intent ?? null,
        providerCustomerId: session.customer ?? null,
        providerSubscriptionId: session.subscription ?? null,
        amountMinor: typeof session.amount_total === 'number' ? session.amount_total : null,
      });

      return respondAfterFinalize(service, result);
    }

    return jsonResponse({ error: `Unsupported payment provider: ${payment.provider}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
