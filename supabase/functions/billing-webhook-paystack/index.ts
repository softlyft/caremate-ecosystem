import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, periodEndIso } from '../_shared/supabase.ts';

async function verifyPaystackSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const digest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return digest === signatureHeader;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) {
      return jsonResponse({ error: 'Paystack not configured' }, 500);
    }

    const payload = await req.text();
    const sig = req.headers.get('x-paystack-signature');
    const valid = await verifyPaystackSignature(payload, sig, secret);
    if (!valid) {
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(payload);
    const service = createServiceClient();
    const now = new Date().toISOString();

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference as string;
      const meta = data.metadata ?? {};
      const billingInterval = (meta.billing_interval as string) || 'monthly';

      const { data: existing } = await service
        .from('subscriptions')
        .select('id, billing_interval')
        .eq('provider_ref', reference)
        .maybeSingle();

      if (existing) {
        await service
          .from('subscriptions')
          .update({
            status: 'active',
            provider_customer_id: data.customer?.customer_code ?? data.customer?.id ?? null,
            current_period_start: now,
            current_period_end: periodEndIso(existing.billing_interval || billingInterval),
            updated_at: now,
          })
          .eq('id', existing.id);
      } else if (meta.subscription_id) {
        await service
          .from('subscriptions')
          .update({
            status: 'active',
            provider_ref: reference,
            provider_customer_id: data.customer?.customer_code ?? null,
            current_period_start: now,
            current_period_end: periodEndIso(billingInterval),
            updated_at: now,
          })
          .eq('id', meta.subscription_id);
      }
    }

    if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
      const data = event.data;
      const code = data.subscription_code as string | undefined;
      if (code) {
        await service
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: now })
          .eq('provider_subscription_id', code);
      }
    }

    return jsonResponse({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
