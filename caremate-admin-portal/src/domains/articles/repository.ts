import { createClient } from '@/lib/supabase/server';
import type { Article } from '@/types/database';

export async function listArticles(filters?: {
  search?: string;
  contentType?: string;
  categoryId?: string;
}): Promise<Article[]> {
  const supabase = await createClient();
  let query = supabase
    .from('articles')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (filters?.contentType) {
    query = query.eq('content_type', filters.contentType);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  // External Currents news has its own admin surface (/dashboard/news).
  query = query.not('id', 'like', 'currents-%');

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function getArticle(id: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Article | null;
}
