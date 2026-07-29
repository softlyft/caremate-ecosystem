import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { Article } from '@/types/database';

export type { PaginatedResult };

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
  query = query.not('id', 'like', 'currents-%');

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function listArticlesPage(
  filters?: {
    search?: string;
    contentType?: string;
    categoryId?: string;
  } & ListPaging,
): Promise<PaginatedResult<Article>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters?.contentType) {
    query = query.eq('content_type', filters.contentType);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  query = query.not('id', 'like', 'currents-%');

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as Article[], count, page, pageSize);
}

export async function getArticle(id: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Article | null;
}
