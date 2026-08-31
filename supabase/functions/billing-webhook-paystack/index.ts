import { finalizeSuccessfulPayment, markPaymentFailed } from '../_shared/billing.ts';
import {
  finalizeProviderOrgPayment,
  markProviderOrgPaymentFailed,
} from '../_shared/provider-org-billing.ts';
import {
  finalizePayerOrgPayment,
  markPayerOrgPaymentFailed,
} from '../_shared/payer-org-billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  sendBillingActivatedEmail,
  sendBillingPaymentFailedEmail,
} from '../_shared/email.ts';
import { createServiceClient } from '../_shared/supabase.ts';

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

function isProviderOrgCharge(reference: string, meta: Record<string, unknown>): boolean {
  if (reference.startsWith('pog_')) return true;
  return meta.product === 'provider_org_private_care_team';
}

function isPayerOrgCharge(reference: string, meta: Record<string, unknown>): boolean {
  if (reference.startsWith('pyo_')) return true;
  return meta.product === 'payer_org_support_team';
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
      const reference = String(data.reference ?? '');
      const meta = (data.metadata ?? {}) as Record<string, unknown>;
      const paymentId = typeof meta.payment_id === 'string' ? meta.payment_id : null;

      try {
        if (isProviderOrgCharge(reference, meta)) {
          await finalizeProviderOrgPayment(service, {
            paymentId,
            providerReference: reference,
            providerTransactionId: data.id != null ? String(data.id) : null,
            providerCustomerId: data.customer?.customer_code ?? data.customer?.id ?? null,
            amountMinor: typeof data.amount === 'number' ? data.amount : null,
            paidAt: now,
          });
        } else if (isPayerOrgCharge(reference, meta)) {
          await finalizePayerOrgPayment(service, {
            paymentId,
            providerReference: reference,
            providerTransactionId: data.id != null ? String(data.id) : null,
            providerCustomerId: data.customer?.customer_code ?? data.customer?.id ?? null,
            amountMinor: typeof data.amount === 'number' ? data.amount : null,
            paidAt: now,
          });
        } else {
          const result = await finalizeSuccessfulPayment(service, {
            paymentId,
            providerReference: reference,
            provider: 'paystack',
            providerTransactionId: data.id != null ? String(data.id) : null,
            providerCustomerId: data.customer?.customer_code ?? data.customer?.id ?? null,
            amountMinor: typeof data.amount === 'number' ? data.amount : null,
            paidAt: now,
          });
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
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Finalize failed';
        console.error('paystack charge.success finalize', message);
        return jsonResponse({ error: message }, 500);
      }
    }

    if (event.event === 'charge.failed') {
      const data = event.data;
      const reference = String(data.reference ?? '');
      const meta = (data.metadata ?? {}) as Record<string, unknown>;
      if (reference) {
        if (isProviderOrgCharge(reference, meta)) {
          await markProviderOrgPaymentFailed(
            service,
            reference,
            data.gateway_response ?? data.message ?? 'charge.failed',
          );
        } else if (isPayerOrgCharge(reference, meta)) {
          await markPayerOrgPaymentFailed(
            service,
            reference,
            data.gateway_response ?? data.message ?? 'charge.failed',
          );
        } else {
          const failed = await markPaymentFailed(
            service,
            'paystack',
            reference,
            data.gateway_response ?? data.message ?? 'charge.failed',
          );
          if (failed) {
            await sendBillingPaymentFailedEmail(service, {
              userId: failed.userId,
              paymentId: failed.paymentId,
              planType: failed.planType,
              reason: data.gateway_response ?? data.message ?? 'charge.failed',
            });
          }
        }
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
        await service
          .from('provider_org_subscriptions')
          .update({ status: 'canceled', updated_at: now })
          .eq('provider_subscription_id', code);
        await service
          .from('payer_org_subscriptions')
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
