import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type LeaderboardEntry = {
  userId: string;
  fullName: string;
  totalPoints: number;
  chapterId: string | null;
  countryCode: string | null;
};

export async function getChapterLeaderboard(
  chapterId: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_leaderboard_points')
    .select('user_id, chapter_id, country_code, total_points')
    .eq('chapter_id', chapterId)
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = data ?? [];
  const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
  const nameById = await loadProfileNames(userIds);

  return rows.map((r) => ({
    userId: r.user_id!,
    fullName: nameById.get(r.user_id!) ?? 'Member',
    totalPoints: Number(r.total_points ?? 0),
    chapterId: r.chapter_id,
    countryCode: r.country_code,
  }));
}

export async function getNationalLeaderboard(
  countryCode: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_leaderboard_points')
    .select('user_id, chapter_id, country_code, total_points')
    .eq('country_code', countryCode)
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = data ?? [];
  const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
  const nameById = await loadProfileNames(userIds);

  return rows.map((r) => ({
    userId: r.user_id!,
    fullName: nameById.get(r.user_id!) ?? 'Member',
    totalPoints: Number(r.total_points ?? 0),
    chapterId: r.chapter_id,
    countryCode: r.country_code,
  }));
}

async function loadProfileNames(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return new Map((data ?? []).map((p) => [p.user_id, p.full_name]));
}
