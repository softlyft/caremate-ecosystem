import { createClient } from '@/lib/supabase/server';
import type { HealthTip } from '@/types/database';

export async function listTips(filters?: {
  categoryId?: string;
  search?: string;
}): Promise<HealthTip[]> {
  const supabase = await createClient();
  let query = supabase
    .from('health_tips')
    .select('*')
    .is('deleted_at', null)
    .order('category_id')
    .order('sort_order', { ascending: true });

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.ilike('body', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as HealthTip[];
}

export async function getTip(id: string): Promise<HealthTip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('health_tips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as HealthTip | null;
}
