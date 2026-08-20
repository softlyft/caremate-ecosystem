/** CareMate hosted checkout origin (no trailing slash). */
export function getPaymentUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PAYMENT_URL ?? 'https://pay.getcaremate.com'
  ).replace(/\/$/, '');
}

export function buildCommunityCheckoutUrl(input: {
  paymentUrl: string;
  appUrl: string;
  planType: 'personal' | 'family';
  billingInterval: 'monthly' | 'yearly';
  currency: 'NGN' | 'USD';
  handoffCode?: string | null;
}): string {
  const query = new URLSearchParams({
    plan_type: input.planType,
    billing_interval: input.billingInterval,
    currency: input.currency,
    source: 'community',
    return_success: `${input.appUrl.replace(/\/$/, '')}/app/profile?paid=1`,
    return_cancel: `${input.appUrl.replace(/\/$/, '')}/app/profile`,
  });
  if (input.handoffCode?.trim()) {
    query.set('handoff', input.handoffCode.trim());
  }
  return `${input.paymentUrl.replace(/\/$/, '')}/?${query.toString()}`;
}
