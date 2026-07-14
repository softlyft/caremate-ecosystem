import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Subscription, SubscriptionPrice } from '@/types/database';

export async function listSubscriptionPrices(): Promise<SubscriptionPrice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_prices')
    .select('*')
    .order('plan_type')
    .order('billing_interval')
    .order('currency');
  if (error) throw error;
  return (data ?? []) as SubscriptionPrice[];
}

export type SubscriberRow = Subscription & {
  email: string | null;
};

export async function listSubscriptions(filters?: {
  status?: string;
  planType?: string;
}): Promise<SubscriberRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.planType) {
    query = query.eq('plan_type', filters.planType);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Subscription[];
  if (rows.length === 0) return [];

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? null] as const),
  );

  return rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
}
