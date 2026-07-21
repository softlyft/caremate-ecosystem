import { createClient } from '@/lib/supabase/server';
import type { AnnouncementReaction, CommunityAnnouncement } from '@/types/database';

export async function listAnnouncements(
  chapterId: string,
): Promise<CommunityAnnouncement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_announcements')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CommunityAnnouncement[];
}

export async function createAnnouncement(input: {
  chapter_id: string;
  title: string;
  body: string;
  published_by: string;
}): Promise<CommunityAnnouncement> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_announcements')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityAnnouncement;
}

export async function reactToAnnouncement(
  announcementId: string,
  userId: string,
  reaction: AnnouncementReaction = 'like',
) {
  const supabase = await createClient();
  const { error } = await supabase.from('community_announcement_reactions').upsert(
    {
      announcement_id: announcementId,
      user_id: userId,
      reaction,
    },
    { onConflict: 'announcement_id,user_id' },
  );
  if (error) throw error;
}

export async function bookmarkAnnouncement(announcementId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('community_announcement_bookmarks').upsert(
    {
      announcement_id: announcementId,
      user_id: userId,
    },
    { onConflict: 'announcement_id,user_id' },
  );
  if (error) throw error;
}
