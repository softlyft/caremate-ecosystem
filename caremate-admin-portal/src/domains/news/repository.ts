import { createClient } from '@/lib/supabase/server';
import type { Article, Json } from '@/types/database';

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

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters?.status === 'published') {
    query = query.not('published_at', 'is', null);
  } else if (filters?.status === 'unpublished') {
    query = query.is('published_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Article[];
  const region = filters?.region?.trim().toUpperCase();
  if (!region) {
    return rows;
  }

  return rows.filter((row) => {
    const attrs = (row.attributes ?? {}) as Record<string, unknown>;
    const regions = attrs.newsRegions;
    if (Array.isArray(regions)) {
      return regions.some(
        (value) => typeof value === 'string' && value.trim().toUpperCase() === region,
      );
    }
    const single = attrs.newsCountryCode;
    return typeof single === 'string' && single.trim().toUpperCase() === region;
  });
}

export type { Json };
