import type { BillingCurrency } from './billing.ts';

type InitializePaystackParams = {
  email: string | null | undefined;
  amountMinor: number;
  currency: BillingCurrency;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
};

export type PaystackInitializeResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; message: string };

/**
 * Initialize a Paystack hosted checkout for NGN or USD.
 * `amountMinor` is kobo (NGN) or cents (USD).
 */
export async function initializePaystackTransaction(
  params: InitializePaystackParams,
): Promise<PaystackInitializeResult> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) {
    return { ok: false, message: 'Paystack is not configured' };
  }

  if (!params.email?.trim()) {
    return { ok: false, message: 'A verified email is required for Paystack checkout' };
  }

  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(params.metadata)) {
    if (value == null) continue;
    metadata[key] = String(value);
  }

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email.trim(),
      amount: params.amountMinor,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata,
    }),
  });

  const paystackJson = await paystackRes.json();
  if (!paystackRes.ok || !paystackJson?.status || !paystackJson?.data?.authorization_url) {
    return {
      ok: false,
      message: paystackJson?.message ?? 'Paystack initialize failed',
    };
  }

  return {
    ok: true,
    authorizationUrl: paystackJson.data.authorization_url as string,
    reference: String(paystackJson.data.reference ?? params.reference),
  };
}
