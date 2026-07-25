import { createClient } from '@/lib/supabase/server';
import { listAllAuthUsers } from '@/lib/list-auth-users';
import type { Payment, Subscription, SubscriptionPrice } from '@/types/database';

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

export type PaymentRow = Payment & {
  email: string | null;
};

async function emailByUserIdMap(): Promise<Map<string, string | null>> {
  const users = await listAllAuthUsers();
  return new Map(users.map((u) => [u.id, u.email ?? null] as const));
}

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

  const emailById = await emailByUserIdMap();
  return rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
}

export async function listPayments(filters?: {
  status?: string;
  provider?: string;
  planType?: string;
}): Promise<PaymentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.provider) {
    query = query.eq('provider', filters.provider);
  }
  if (filters?.planType) {
    query = query.eq('plan_type', filters.planType);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Payment[];
  if (rows.length === 0) return [];

  const emailById = await emailByUserIdMap();
  return rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
}
