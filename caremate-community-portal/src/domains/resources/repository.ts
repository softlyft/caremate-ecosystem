import { createClient } from '@/lib/supabase/server';
import type { CommunityResource } from '@/types/database';

export async function searchResources(filters?: {
  query?: string;
  chapterId?: string;
  tags?: string[];
  limit?: number;
}): Promise<CommunityResource[]> {
  const supabase = await createClient();
  let q = supabase
    .from('community_resources')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.chapterId) {
    q = q.or(`chapter_id.eq.${filters.chapterId},is_global.eq.true`);
  }
  if (filters?.query?.trim()) {
    q = q.or(
      `title.ilike.%${filters.query.trim()}%,description.ilike.%${filters.query.trim()}%`,
    );
  }
  if (filters?.tags?.length) {
    q = q.overlaps('tags', filters.tags);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CommunityResource[];
}

export async function getResource(resourceId: string): Promise<CommunityResource | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_resources')
    .select('*')
    .eq('id', resourceId)
    .maybeSingle();

  if (error) throw error;
  return (data as CommunityResource | null) ?? null;
}

/** Records a download and returns a signed URL when possible. */
export async function recordDownload(resourceId: string): Promise<{
  resource: CommunityResource;
  signedUrl: string | null;
}> {
  const resource = await getResource(resourceId);
  if (!resource) throw new Error('Resource not found');

  const supabase = await createClient();
  const { data: signed } = await supabase.storage
    .from('community-resources')
    .createSignedUrl(resource.storage_path, 60 * 10);

  return {
    resource,
    signedUrl: signed?.signedUrl ?? null,
  };
}
