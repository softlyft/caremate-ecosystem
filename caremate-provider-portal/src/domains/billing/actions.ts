'use server';

import { revalidatePath } from 'next/cache';
import { requireManageAccess, requireWriteAccess } from '@/lib/auth';
import { setPrivateCareTeamMember } from '@/domains/billing/repository';

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
  const session = await requireWriteAccess();
  const planTier = String(formData.get('plan_tier') ?? '').trim() as 'basic' | 'pro';
  const billingInterval = String(formData.get('billing_interval') ?? 'monthly').trim() as
    | 'monthly'
    | 'yearly';

  if (planTier !== 'basic' && planTier !== 'pro') {
    throw new Error('Choose Basic or Pro');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const website =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') || 'https://www.getcaremate.com';
  const careUrl =
    process.env.NEXT_PUBLIC_CARE_URL?.replace(/\/$/, '') || 'https://care.getcaremate.com';

  if (!url || !anon) {
    throw new Error('Checkout is not configured');
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  const successUrl = `${careUrl}/app/settings/billing?paid=1`;
  const cancelUrl = `${website}/providers/pricing`;

  const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/create-provider-org-checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organization_id: session.activeOrganizationId,
      plan_tier: planTier,
      billing_interval: billingInterval,
      currency: 'NGN',
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    url?: string;
    authorization_url?: string;
  } | null;

  const checkoutUrl = payload?.url ?? payload?.authorization_url;
  if (!response.ok || !checkoutUrl) {
    throw new Error(payload?.error ?? 'Could not start checkout');
  }

  return { url: checkoutUrl };
}
