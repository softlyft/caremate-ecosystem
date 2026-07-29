import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { Payment, Subscription, SubscriptionPrice } from '@/types/database';

export type { PaginatedResult };

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

async function emailByUserIdMap(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('user_id, email').in('user_id', userIds);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.user_id, p.email ?? null] as const));
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

  const emailById = await emailByUserIdMap(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
}

export async function listSubscriptionsPage(
  filters?: {
    status?: string;
    planType?: string;
  } & ListPaging,
): Promise<PaginatedResult<SubscriberRow>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('subscriptions')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.planType) {
    query = query.eq('plan_type', filters.planType);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Subscription[];
  const emailById = await emailByUserIdMap(rows.map((row) => row.user_id));
  const enriched = rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
  return paginatedResult(enriched, count, page, pageSize);
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

  const emailById = await emailByUserIdMap(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
}

export async function listPaymentsPage(
  filters?: {
    status?: string;
    provider?: string;
    planType?: string;
  } & ListPaging,
): Promise<PaginatedResult<PaymentRow>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.provider) {
    query = query.eq('provider', filters.provider);
  }
  if (filters?.planType) {
    query = query.eq('plan_type', filters.planType);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Payment[];
  const emailById = await emailByUserIdMap(rows.map((row) => row.user_id));
  const enriched = rows.map((row) => ({
    ...row,
    email: emailById.get(row.user_id) ?? null,
  }));
  return paginatedResult(enriched, count, page, pageSize);
}
