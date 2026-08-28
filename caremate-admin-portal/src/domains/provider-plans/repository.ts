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
