'use server';

import { revalidatePath } from 'next/cache';
import { requireManageAccess } from '@/lib/auth';
import { setPrivateCareTeamMember } from '@/domains/billing/repository';
import { getCareUrl, getPaymentUrl, getWebsiteUrl } from '@/lib/env';
import { buildCarePortalOrgCheckoutUrl } from '@/lib/payment-url';

export async function setPrivateCareTeamMemberAction(formData: FormData) {
  const session = await requireManageAccess();
  const userId = String(formData.get('user_id') ?? '').trim();
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!userId) throw new Error('User is required');

  await setPrivateCareTeamMember({
    organizationId: session.activeOrganizationId,
    userId,
    enabled,
  });

  revalidatePath('/app/patients');
  revalidatePath(`/app/patients/${userId}`);
  revalidatePath('/app/settings/billing');
}

export async function startProviderOrgCheckoutAction(formData: FormData) {
  const session = await requireManageAccess();
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

  const website = getWebsiteUrl();
  const careUrl = getCareUrl();

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
      product: 'provider_org',
      organizationId: session.activeOrganizationId,
      planTier,
      billingInterval,
      handoffCode,
    }),
  };
}
