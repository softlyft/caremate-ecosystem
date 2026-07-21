import { createClient } from '@/lib/supabase/server';
import type { CommunityNotification } from '@/types/database';

export async function listUnread(
  userId: string,
  limit = 30,
): Promise<CommunityNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CommunityNotification[];
}

export async function listRecent(
  userId: string,
  limit = 30,
): Promise<CommunityNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CommunityNotification[];
}

export async function markRead(
  notificationId: string,
  userId: string,
): Promise<CommunityNotification> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityNotification;
}

export async function createNotification(input: {
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link_path?: string | null;
}): Promise<CommunityNotification> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_notifications')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityNotification;
}

export async function notifyUsers(
  userIds: string[],
  input: Omit<Parameters<typeof createNotification>[0], 'user_id'>,
): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  await Promise.all(uniqueIds.map((user_id) => createNotification({ user_id, ...input })));
}
