import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { Article, Json } from '@/types/database';

export type { PaginatedResult, Json };

function matchesRegion(row: Article, region: string): boolean {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const regions = attrs.newsRegions;
  if (Array.isArray(regions)) {
    return regions.some(
      (value) => typeof value === 'string' && value.trim().toUpperCase() === region,
    );
  }
  const single = attrs.newsCountryCode;
  return typeof single === 'string' && single.trim().toUpperCase() === region;
}

function applyNewsFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: {
    search?: string;
    status?: 'published' | 'unpublished' | 'all';
  },
) {
  let q = query;
  if (filters?.search) {
    q = q.ilike('title', `%${filters.search}%`);
  }
  if (filters?.status === 'published') {
    q = q.not('published_at', 'is', null);
  } else if (filters?.status === 'unpublished') {
    q = q.is('published_at', null);
  }
  return q;
}

export async function listExternalNews(filters?: {
  search?: string;
  region?: string;
  status?: 'published' | 'unpublished' | 'all';
}): Promise<Article[]> {
  const supabase = await createClient();
  let query = supabase
    .from('articles')
    .select('*')
    .is('deleted_at', null)
    .like('id', 'currents-%')
    .order('first_seen_at', { ascending: false, nullsFirst: false });

  query = applyNewsFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Article[];
  const region = filters?.region?.trim().toUpperCase();
  if (!region) {
    return rows;
  }

  return rows.filter((row) => matchesRegion(row, region));
}

export async function listExternalNewsPage(
  filters?: {
    search?: string;
    region?: string;
    status?: 'published' | 'unpublished' | 'all';
  } & ListPaging,
): Promise<PaginatedResult<Article>> {
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);
  const region = filters?.region?.trim().toUpperCase();

  if (region) {
    const all = await listExternalNews(filters);
    const slice = all.slice(from, to + 1);
    return paginatedResult(slice, all.length, page, pageSize);
  }

  const supabase = await createClient();
  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .like('id', 'currents-%')
    .order('first_seen_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  query = applyNewsFilters(query, filters);

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as Article[], count, page, pageSize);
}
