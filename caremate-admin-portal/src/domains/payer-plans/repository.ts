import { createClient } from '@/lib/supabase/server';
import type { PayerOrgPlanPrice, PayerOrgSubscription } from '@/domains/payer-plans/types';

export async function listPayerOrgPlanPrices(): Promise<PayerOrgPlanPrice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payer_org_plan_prices')
    .select('*')
    .order('plan_tier')
    .order('billing_interval');
  if (error) throw error;
  return (data ?? []) as PayerOrgPlanPrice[];
}

export async function listPayerOrgSubscriptions(limit = 100): Promise<PayerOrgSubscription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payer_org_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PayerOrgSubscription[];
}

export type PayerOrgPlanActivationContext = {
  found: boolean;
  organizationId: string;
  organizationName: string | null;
  claimed: boolean;
  activeSubscription: PayerOrgSubscription | null;
};

export async function getPayerOrgPlanActivationContext(
  organizationId: string,
): Promise<PayerOrgPlanActivationContext> {
  const supabase = await createClient();
  const orgId = organizationId.trim();

  const { data: org, error: orgError } = await supabase
    .from('payer_organizations')
    .select('id, name, deleted_at')
    .eq('id', orgId)
    .maybeSingle();
  if (orgError) throw orgError;

  if (!org || org.deleted_at) {
    return {
      found: false,
      organizationId: orgId,
      organizationName: null,
      claimed: false,
      activeSubscription: null,
    };
  }

  const [{ data: claimed }, { data: subs, error: subsError }] = await Promise.all([
    supabase.rpc('is_payer_org_claimed', { p_org_id: orgId }),
    supabase
      .from('payer_org_subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  if (subsError) throw subsError;

  return {
    found: true,
    organizationId: orgId,
    organizationName: org.name,
    claimed: Boolean(claimed),
    activeSubscription: (subs?.[0] ?? null) as PayerOrgSubscription | null,
  };
}
