import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, periodEndIso } from '../_shared/supabase.ts';

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), v];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const digest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return digest === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret || !stripeKey) {
      return jsonResponse({ error: 'Stripe webhook not configured' }, 500);
    }

    const payload = await req.text();
    const sig = req.headers.get('stripe-signature');
    const valid = await verifyStripeSignature(payload, sig, secret);
    if (!valid) {
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(payload);
    const service = createServiceClient();
    const now = new Date().toISOString();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subscriptionId =
        session.metadata?.subscription_id || session.client_reference_id;
      if (!subscriptionId) {
        return jsonResponse({ received: true, skipped: true });
      }

      const billingInterval = session.metadata?.billing_interval || 'monthly';
      const periodStart = now;
      const periodEnd = periodEndIso(billingInterval);

      await service
        .from('subscriptions')
        .update({
          status: 'active',
          provider_customer_id: session.customer ?? null,
          provider_subscription_id: session.subscription ?? null,
          provider_ref: session.id,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: now,
        })
        .eq('id', subscriptionId);
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object;
      const subscriptionId = sub.metadata?.subscription_id;
      const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        incomplete: 'incomplete',
        incomplete_expired: 'expired',
      };
      const status =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : statusMap[sub.status] ?? 'incomplete';

      const update: Record<string, unknown> = {
        status,
        provider_subscription_id: sub.id,
        provider_customer_id: sub.customer ?? null,
        updated_at: now,
      };
      if (sub.current_period_start) {
        update.current_period_start = new Date(sub.current_period_start * 1000).toISOString();
      }
      if (sub.current_period_end) {
        update.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
      }

      if (subscriptionId) {
        await service.from('subscriptions').update(update).eq('id', subscriptionId);
      } else {
        await service
          .from('subscriptions')
          .update(update)
          .eq('provider_subscription_id', sub.id);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const stripeSubId = invoice.subscription;
      if (stripeSubId) {
        await service
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: now })
          .eq('provider_subscription_id', stripeSubId);
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const stripeSubId = invoice.subscription;
      if (stripeSubId) {
        await service
          .from('subscriptions')
          .update({ status: 'active', updated_at: now })
          .eq('provider_subscription_id', stripeSubId);
      }
    }

    return jsonResponse({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
