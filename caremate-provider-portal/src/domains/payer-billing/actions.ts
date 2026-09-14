'use server';

import { revalidatePath } from 'next/cache';
import { requirePayerManageAccess } from '@/lib/auth';
import { setSupportTeamMember } from '@/domains/payer-billing/repository';
import { buildCarePortalOrgCheckoutUrl, getPaymentUrl } from '@/lib/payment-url';

export async function setSupportTeamMemberAction(formData: FormData) {
  const session = await requirePayerManageAccess();
  const userId = String(formData.get('user_id') ?? '').trim();
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!userId) throw new Error('User is required');

  await setSupportTeamMember({
    organizationId: session.activeOrganizationId,
    userId,
    enabled,
  });

  revalidatePath('/payer/patients');
  revalidatePath(`/payer/patients/${userId}`);
  revalidatePath('/payer/settings/billing');
}

export async function startPayerOrgCheckoutAction(formData: FormData) {
  const session = await requirePayerManageAccess();
  const planTier = String(formData.get('plan_tier') ?? '').trim() as 'basic' | 'pro';
  const billingInterval = String(formData.get('billing_interval') ?? 'monthly').trim() as
    | 'monthly'
    | 'yearly';

  if (planTier !== 'basic' && planTier !== 'pro') {
    throw new Error('Choose Basic or Pro');
  }
  if (billingInterval !== 'monthly' && billingInterval !== 'yearly') {
    throw new Error('Choose monthly or yearly billing');
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const refreshToken = sessionData.session?.refresh_token;
  if (!accessToken) throw new Error('Not authenticated');

  const website =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') || 'https://www.getcaremate.com';
  const careUrl =
    process.env.NEXT_PUBLIC_CARE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://care.getcaremate.com';

  let handoffCode: string | null = null;
  if (refreshToken) {
    const { data, error } = await supabase.functions.invoke('create-checkout-handoff', {
      body: { refresh_token: refreshToken },
    });
    if (!error && typeof data?.code === 'string' && data.code.trim()) {
      handoffCode = data.code.trim();
    }
  }

  return {
    url: buildCarePortalOrgCheckoutUrl({
      paymentUrl: getPaymentUrl(),
      careUrl,
      websiteUrl: website,
      product: 'payer_org',
      organizationId: session.activeOrganizationId,
      planTier,
      billingInterval,
      handoffCode,
    }),
  };
}
