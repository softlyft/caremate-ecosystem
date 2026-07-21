import { createClient } from '@/lib/supabase/server';
import type {
  ChapterType,
  CommunityChapter,
  CommunityChapterRequest,
} from '@/types/database';

export async function searchChapters(filters?: {
  query?: string;
  countryCode?: string;
  chapterType?: ChapterType;
  limit?: number;
}): Promise<CommunityChapter[]> {
  const supabase = await createClient();
  let q = supabase
    .from('community_chapters')
    .select('*')
    .eq('status', 'active')
    .order('member_count', { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.countryCode) {
    q = q.eq('country_code', filters.countryCode);
  }
  if (filters?.chapterType) {
    q = q.eq('chapter_type', filters.chapterType);
  }
  if (filters?.query?.trim()) {
    q = q.or(
      `name.ilike.%${filters.query.trim()}%,description.ilike.%${filters.query.trim()}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CommunityChapter[];
}

export async function getChapter(chapterId: string): Promise<CommunityChapter | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_chapters')
    .select('*')
    .eq('id', chapterId)
    .maybeSingle();

  if (error) throw error;
  return (data as CommunityChapter | null) ?? null;
}

export async function requestChapterCreation(input: {
  requested_by: string;
  name: string;
  description?: string | null;
  chapter_type: ChapterType;
  country_code: string;
  state_id?: string | null;
  city_id?: string | null;
}): Promise<CommunityChapterRequest> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_chapter_requests')
    .insert({
      ...input,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityChapterRequest;
}
