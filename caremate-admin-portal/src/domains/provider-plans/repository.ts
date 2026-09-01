import { createClient } from '@/lib/supabase/server';
import type { ProviderOrgPlanPrice, ProviderOrgSubscription } from '@/domains/provider-plans/types';

export async function listProviderOrgPlanPrices(): Promise<ProviderOrgPlanPrice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_org_plan_prices')
    .select('*')
    .order('plan_tier')
    .order('billing_interval');
  if (error) throw error;
  return (data ?? []) as ProviderOrgPlanPrice[];
}

export async function listProviderOrgSubscriptions(limit = 100): Promise<ProviderOrgSubscription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_org_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ProviderOrgSubscription[];
}

export type ProviderOrgPlanActivationContext = {
  found: boolean;
  organizationId: string;
  organizationName: string | null;
  claimed: boolean;
  activeSubscription: ProviderOrgSubscription | null;
};

export async function getProviderOrgPlanActivationContext(
  organizationId: string,
): Promise<ProviderOrgPlanActivationContext> {
  const supabase = await createClient();
  const orgId = organizationId.trim();

  const { data: org, error: orgError } = await supabase
    .from('provider_organizations')
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
    supabase.rpc('is_provider_org_claimed', { p_org_id: orgId }),
    supabase
      .from('provider_org_subscriptions')
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
    activeSubscription: (subs?.[0] ?? null) as ProviderOrgSubscription | null,
  };
}
