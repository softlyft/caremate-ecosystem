import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ChapterRequestStatus,
  ChapterStatus,
  CommunityBadge,
  CommunityCertificate,
  CommunityChapter,
  CommunityChapterRequest,
  CommunityCountry,
  CommunityEvent,
  CommunityProfile,
  CommunityResource,
  CommunityStats,
} from '@/types/community';

/**
 * Untyped admin access for community_* tables until `@caremate/db-types` is regenerated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function communityFrom(table: string): any {
  return (createAdminClient() as unknown as { from: (t: string) => unknown }).from(table);
}

export async function listProfiles(): Promise<CommunityProfile[]> {
  const { data: memberships, error: membershipError } = await communityFrom(
    'community_memberships',
  )
    .select('user_id')
    .eq('status', 'approved');
  if (membershipError) throw membershipError;

  const userIds = [...new Set((memberships ?? []).map((row: { user_id: string }) => row.user_id))];
  if (userIds.length === 0) return [];

  const { data, error } = await communityFrom('profiles')
    .select('user_id, full_name, email, phone, patient_id, avatar_url, country_code, created_at, updated_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunityProfile[];
}

export async function listChapters(status?: ChapterStatus): Promise<CommunityChapter[]> {
  let query = communityFrom('community_chapters').select('*').order('created_at', {
    ascending: false,
  });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CommunityChapter[];
}

export async function listCountries(): Promise<CommunityCountry[]> {
  const { data, error } = await communityFrom('community_countries')
    .select('code, name, administrative_level_config, administrative_options')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityCountry[];
}

export async function getChapter(chapterId: string): Promise<CommunityChapter | null> {
  const { data, error } = await communityFrom('community_chapters')
    .select('*')
    .eq('id', chapterId)
    .maybeSingle();
  if (error) throw error;
  return (data as CommunityChapter | null) ?? null;
}

export async function listChapterRequests(
  status: ChapterRequestStatus = 'pending',
): Promise<CommunityChapterRequest[]> {
  const { data, error } = await communityFrom('community_chapter_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunityChapterRequest[];
}

export async function listEvents(): Promise<(CommunityEvent & { chapter_name?: string })[]> {
  const { data, error } = await communityFrom('community_events')
    .select('*, community_chapters(name)')
    .order('starts_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Array<CommunityEvent & { community_chapters?: { name: string } | null }>).map(
    (row) => ({
      ...row,
      chapter_name: row.community_chapters?.name,
      community_chapters: undefined,
    }),
  );
}

export async function listResources(): Promise<CommunityResource[]> {
  const { data, error } = await communityFrom('community_resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunityResource[];
}

export async function listBadges(): Promise<CommunityBadge[]> {
  const { data, error } = await communityFrom('community_badges')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityBadge[];
}

export async function listCertificates(): Promise<CommunityCertificate[]> {
  const { data, error } = await communityFrom('community_certificates')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityCertificate[];
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const [
    profiles,
    members,
    chapters,
    requests,
    events,
    resources,
    contributions,
    badges,
    certificates,
  ] = await Promise.all([
    communityFrom('community_memberships').select('user_id').eq('status', 'approved'),
    communityFrom('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    communityFrom('community_chapters')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    communityFrom('community_chapter_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    communityFrom('community_events').select('id', { count: 'exact', head: true }),
    communityFrom('community_resources').select('id', { count: 'exact', head: true }),
    communityFrom('community_contributions').select('id', { count: 'exact', head: true }),
    communityFrom('community_badges').select('id', { count: 'exact', head: true }),
    communityFrom('community_certificates').select('id', { count: 'exact', head: true }),
  ]);

  const firstError = [
    profiles,
    members,
    chapters,
    requests,
    events,
    resources,
    contributions,
    badges,
    certificates,
  ].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  return {
    profileCount: new Set(
      (profiles.data ?? []).map((row: { user_id: string }) => row.user_id),
    ).size,
    approvedMemberCount: members.count ?? 0,
    activeChapterCount: chapters.count ?? 0,
    pendingChapterRequestCount: requests.count ?? 0,
    eventCount: events.count ?? 0,
    resourceCount: resources.count ?? 0,
    contributionCount: contributions.count ?? 0,
    badgeCount: badges.count ?? 0,
    certificateCount: certificates.count ?? 0,
  };
}

export async function getChapterRequest(
  id: string,
): Promise<CommunityChapterRequest | null> {
  const { data, error } = await communityFrom('community_chapter_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as CommunityChapterRequest | null) ?? null;
}
