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
