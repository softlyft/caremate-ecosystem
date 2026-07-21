import { createClient } from '@/lib/supabase/server';
import type { CommunityGalleryItem } from '@/types/database';

export async function listGallery(
  chapterId: string,
  limit = 40,
): Promise<CommunityGalleryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_gallery_items')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CommunityGalleryItem[];
}

export async function addGalleryItem(input: {
  chapter_id: string;
  image_url: string;
  caption?: string | null;
  event_id?: string | null;
  uploaded_by: string;
}): Promise<CommunityGalleryItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_gallery_items')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityGalleryItem;
}
