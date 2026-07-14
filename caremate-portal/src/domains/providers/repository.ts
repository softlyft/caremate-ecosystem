import { createClient } from '@/lib/supabase/server';
import type { Provider } from '@/types/database';

export async function listProviders(filters?: {
  search?: string;
  type?: string;
}): Promise<Provider[]> {
  const supabase = await createClient();
  let query = supabase.from('providers').select('*').order('name', { ascending: true });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Provider[];
}

export async function getProvider(id: string): Promise<Provider | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Provider | null;
}
