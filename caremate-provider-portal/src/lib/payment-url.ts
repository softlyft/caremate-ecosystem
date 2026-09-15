import { getPaymentUrl } from '@/lib/env';

export { getPaymentUrl };

export function buildCarePortalOrgCheckoutUrl(input: {
  paymentUrl: string;
  careUrl: string;
  websiteUrl: string;
  product: 'provider_org' | 'payer_org';
  organizationId: string;
  planTier: 'basic' | 'pro';
  billingInterval: 'monthly' | 'yearly';
  handoffCode?: string | null;
}): string {
  const care = input.careUrl.replace(/\/$/, '');
  const website = input.websiteUrl.replace(/\/$/, '');
  const isProvider = input.product === 'provider_org';
  const query = new URLSearchParams({
    product: input.product,
    organization_id: input.organizationId,
    plan_tier: input.planTier,
    billing_interval: input.billingInterval,
    currency: 'NGN',
    source: isProvider ? 'care_portal_provider' : 'care_portal_payer',
    return_success: isProvider
      ? `${care}/app/settings/billing?paid=1`
      : `${care}/payer/settings/billing?paid=1`,
    return_cancel: isProvider
      ? `${website}/providers/pricing`
      : `${website}/payers/pricing`,
  });
  if (input.handoffCode?.trim()) {
    query.set('handoff', input.handoffCode.trim());
  }
  return `${input.paymentUrl.replace(/\/$/, '')}/?${query.toString()}`;
}
