import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
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

export type { PaginatedResult };

/**
 * Untyped admin access for community_* tables until `@caremate/db-types` is regenerated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function communityFrom(table: string): any {
  return (createAdminClient() as unknown as { from: (t: string) => unknown }).from(table);
}

const PROFILE_COLUMNS =
  'user_id, full_name, email, phone, patient_id, avatar_url, country_code, created_at, updated_at';

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
    .select(PROFILE_COLUMNS)
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunityProfile[];
}

export async function listProfilesPage(
  opts?: ListPaging,
): Promise<PaginatedResult<CommunityProfile>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data: memberships, error: membershipError } = await communityFrom(
    'community_memberships',
  )
    .select('user_id')
    .eq('status', 'approved');
  if (membershipError) throw membershipError;

  const userIds = [...new Set((memberships ?? []).map((row: { user_id: string }) => row.user_id))];
  const total = userIds.length;
  if (total === 0) return emptyPage<CommunityProfile>(page, pageSize);

  const pageUserIds = userIds.slice(from, to + 1);
  if (pageUserIds.length === 0) return paginatedResult([], total, page, pageSize);

  const { data, error } = await communityFrom('profiles')
    .select(PROFILE_COLUMNS)
    .in('user_id', pageUserIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityProfile[], total, page, pageSize);
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

export async function listChaptersPage(
  opts?: { status?: ChapterStatus } & ListPaging,
): Promise<PaginatedResult<CommunityChapter>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = communityFrom('community_chapters')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityChapter[], count, page, pageSize);
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

export async function listChapterRequestsPage(
  opts?: { status?: ChapterRequestStatus } & ListPaging,
): Promise<PaginatedResult<CommunityChapterRequest>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);
  const status = opts?.status ?? 'pending';

  const { data, error, count } = await communityFrom('community_chapter_requests')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityChapterRequest[], count, page, pageSize);
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

export async function listEventsPage(
  opts?: ListPaging,
): Promise<PaginatedResult<CommunityEvent & { chapter_name?: string }>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await communityFrom('community_events')
    .select('*, community_chapters(name)', { count: 'exact' })
    .order('starts_at', { ascending: false })
    .range(from, to);
  if (error) throw error;

  const rows = (
    (data ?? []) as Array<CommunityEvent & { community_chapters?: { name: string } | null }>
  ).map((row) => ({
    ...row,
    chapter_name: row.community_chapters?.name,
    community_chapters: undefined,
  }));
  return paginatedResult(rows, count, page, pageSize);
}

export async function listResources(): Promise<CommunityResource[]> {
  const { data, error } = await communityFrom('community_resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunityResource[];
}

export async function listResourcesPage(
  opts?: ListPaging,
): Promise<PaginatedResult<CommunityResource>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await communityFrom('community_resources')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityResource[], count, page, pageSize);
}

export async function listBadges(): Promise<CommunityBadge[]> {
  const { data, error } = await communityFrom('community_badges')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityBadge[];
}

export async function listBadgesPage(
  opts?: ListPaging,
): Promise<PaginatedResult<CommunityBadge>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await communityFrom('community_badges')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityBadge[], count, page, pageSize);
}

export async function listCertificates(): Promise<CommunityCertificate[]> {
  const { data, error } = await communityFrom('community_certificates')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommunityCertificate[];
}

export async function listCertificatesPage(
  opts?: ListPaging,
): Promise<PaginatedResult<CommunityCertificate>> {
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await communityFrom('community_certificates')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return paginatedResult((data ?? []) as CommunityCertificate[], count, page, pageSize);
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
