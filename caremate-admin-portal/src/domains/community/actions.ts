'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalSession } from '@/lib/auth';
import { canManageCommunity } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import type {
  AdministrativeLevel,
  ChapterStatus,
  ChapterType,
  CommunityBadge,
  CommunityCertificate,
  CommunityChapter,
  CommunityContribution,
  CommunityResource,
  CommunityUserBadge,
} from '@/types/community';
import { sanitizeAdministrativeHierarchy } from '@/lib/community-geography';

const COMMUNITY_PATHS = [
  '/dashboard/community',
  '/dashboard/community/profiles',
  '/dashboard/community/chapters',
  '/dashboard/community/chapters/requests',
  '/dashboard/community/events',
  '/dashboard/community/resources',
  '/dashboard/community/recognition',
  '/dashboard/community/reports',
] as const;

function revalidateCommunity() {
  for (const path of COMMUNITY_PATHS) {
    revalidatePath(path);
  }
}

async function requireCommunityEditor() {
  const session = await requirePortalSession();
  if (!canManageCommunity(session.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function communityFrom(table: string): any {
  return (createAdminClient() as unknown as { from: (t: string) => unknown }).from(table);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `chapter-${crypto.randomUUID().slice(0, 8)}`;
}

async function uniqueChapterSlug(name: string, excludeChapterId?: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    let query = communityFrom('community_chapters').select('id').eq('slug', candidate);
    if (excludeChapterId) {
      query = query.neq('id', excludeChapterId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

async function normalizeChapterHierarchy(
  countryCode: string,
  hierarchy?: Record<string, string>,
): Promise<Record<string, string>> {
  const { data: country, error: countryError } = await communityFrom('community_countries')
    .select('administrative_level_config')
    .eq('code', countryCode)
    .maybeSingle();
  if (countryError) throw countryError;
  if (!country) throw new Error('Country not found');

  return sanitizeAdministrativeHierarchy(
    (country.administrative_level_config ?? []) as AdministrativeLevel[],
    hierarchy ?? {},
  );
}

export async function approveChapterRequest(requestId: string, reviewNote?: string | null) {
  const session = await requireCommunityEditor();
  const now = new Date().toISOString();

  const { data: request, error: loadError } = await communityFrom('community_chapter_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!request) throw new Error('Chapter request not found');
  if (request.status !== 'pending') throw new Error('Request is not pending');

  const slug = await uniqueChapterSlug(request.name);
  const chapterId = crypto.randomUUID();

  const { error: chapterError } = await communityFrom('community_chapters').insert({
    id: chapterId,
    name: request.name,
    slug,
    description: request.description,
    chapter_type: request.chapter_type,
    country_code: request.country_code,
    administrative_hierarchy: request.administrative_hierarchy ?? {},
    state_id: request.state_id,
    city_id: request.city_id,
    lead_user_id: request.requested_by,
    status: 'active',
    created_at: now,
    updated_at: now,
  });
  if (chapterError) throw chapterError;

  const { error: membershipError } = await communityFrom('community_memberships').upsert(
    {
      id: crypto.randomUUID(),
      user_id: request.requested_by,
      chapter_id: chapterId,
      role: 'lead',
      status: 'approved',
      reviewed_by: session.user.id,
      reviewed_at: now,
      created_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,chapter_id' },
  );
  if (membershipError) throw membershipError;

  const { error: updateError } = await communityFrom('community_chapter_requests')
    .update({
      status: 'approved',
      review_note: reviewNote?.trim() || null,
      reviewed_by: session.user.id,
      reviewed_at: now,
      created_chapter_id: chapterId,
      updated_at: now,
    })
    .eq('id', requestId);
  if (updateError) throw updateError;

  await writeAuditEvent({
    action: 'approve_chapter_request',
    entityType: 'community_chapter_request',
    entityId: requestId,
    payload: { chapterId },
  });

  revalidateCommunity();
  return chapterId;
}

export async function rejectChapterRequest(requestId: string, reviewNote?: string | null) {
  const session = await requireCommunityEditor();
  const now = new Date().toISOString();

  const { error } = await communityFrom('community_chapter_requests')
    .update({
      status: 'rejected',
      review_note: reviewNote?.trim() || null,
      reviewed_by: session.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending');
  if (error) throw error;

  await writeAuditEvent({
    action: 'reject_chapter_request',
    entityType: 'community_chapter_request',
    entityId: requestId,
  });

  revalidateCommunity();
}

export type CreateChapterInput = {
  name: string;
  description?: string | null;
  chapter_type: ChapterType;
  country_code: string;
  administrative_hierarchy?: Record<string, string>;
  state_id?: string | null;
  city_id?: string | null;
  lead_user_id?: string | null;
  deputy_user_id?: string | null;
  status?: ChapterStatus;
};

export async function createChapter(input: CreateChapterInput): Promise<CommunityChapter> {
  await requireCommunityEditor();
  const now = new Date().toISOString();
  const slug = await uniqueChapterSlug(input.name);
  const id = crypto.randomUUID();
  const administrativeHierarchy = await normalizeChapterHierarchy(
    input.country_code,
    input.administrative_hierarchy,
  );

  const { data, error } = await communityFrom('community_chapters')
    .insert({
      id,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      chapter_type: input.chapter_type,
      country_code: input.country_code,
      administrative_hierarchy: administrativeHierarchy,
      state_id: input.state_id || null,
      city_id: input.city_id || null,
      lead_user_id: input.lead_user_id || null,
      deputy_user_id: input.deputy_user_id || null,
      status: input.status ?? 'active',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;

  await writeAuditEvent({
    action: 'create_chapter',
    entityType: 'community_chapter',
    entityId: id,
  });

  revalidateCommunity();
  return data as CommunityChapter;
}

export type UpdateChapterInput = {
  id: string;
  name: string;
  description?: string | null;
  chapter_type: ChapterType;
  country_code: string;
  administrative_hierarchy?: Record<string, string>;
  status: ChapterStatus;
};

export async function updateChapter(input: UpdateChapterInput): Promise<CommunityChapter> {
  await requireCommunityEditor();
  const now = new Date().toISOString();
  const slug = await uniqueChapterSlug(input.name, input.id);
  const administrativeHierarchy = await normalizeChapterHierarchy(
    input.country_code,
    input.administrative_hierarchy,
  );

  const { data, error } = await communityFrom('community_chapters')
    .update({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      chapter_type: input.chapter_type,
      country_code: input.country_code,
      administrative_hierarchy: administrativeHierarchy,
      status: input.status,
      updated_at: now,
    })
    .eq('id', input.id)
    .select('*')
    .single();
  if (error) throw error;

  await writeAuditEvent({
    action: 'update_chapter',
    entityType: 'community_chapter',
    entityId: input.id,
  });

  revalidateCommunity();
  return data as CommunityChapter;
}

export async function updateChapterStatus(chapterId: string, status: ChapterStatus) {
  await requireCommunityEditor();
  const { error } = await communityFrom('community_chapters')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', chapterId);
  if (error) throw error;
  await writeAuditEvent({
    action: 'update_chapter_status',
    entityType: 'community_chapter',
    entityId: chapterId,
    payload: { status },
  });
  revalidateCommunity();
}

export async function assignChapterLeaders(
  chapterId: string,
  leadUserId: string | null,
  deputyUserId: string | null,
) {
  await requireCommunityEditor();
  const now = new Date().toISOString();

  const { error } = await communityFrom('community_chapters')
    .update({
      lead_user_id: leadUserId,
      deputy_user_id: deputyUserId,
      updated_at: now,
    })
    .eq('id', chapterId);
  if (error) throw error;

  if (leadUserId) {
    await communityFrom('community_memberships').upsert(
      {
        id: crypto.randomUUID(),
        user_id: leadUserId,
        chapter_id: chapterId,
        role: 'lead',
        status: 'approved',
        reviewed_at: now,
        updated_at: now,
        created_at: now,
      },
      { onConflict: 'user_id,chapter_id' },
    );
  }
  if (deputyUserId) {
    await communityFrom('community_memberships').upsert(
      {
        id: crypto.randomUUID(),
        user_id: deputyUserId,
        chapter_id: chapterId,
        role: 'deputy',
        status: 'approved',
        reviewed_at: now,
        updated_at: now,
        created_at: now,
      },
      { onConflict: 'user_id,chapter_id' },
    );
  }

  await writeAuditEvent({
    action: 'assign_chapter_leaders',
    entityType: 'community_chapter',
    entityId: chapterId,
    payload: { leadUserId, deputyUserId },
  });

  revalidateCommunity();
}

export type CreateBadgeInput = {
  slug: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  points_value?: number;
  is_active?: boolean;
};

export async function createBadge(input: CreateBadgeInput): Promise<CommunityBadge> {
  await requireCommunityEditor();
  const id = crypto.randomUUID();
  const { data, error } = await communityFrom('community_badges')
    .insert({
      id,
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      icon_url: input.icon_url?.trim() || null,
      points_value: input.points_value ?? 0,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAuditEvent({
    action: 'create_badge',
    entityType: 'community_badge',
    entityId: id,
  });
  revalidateCommunity();
  return data as CommunityBadge;
}

export type CreateCertificateInput = {
  slug: string;
  name: string;
  description?: string | null;
  template_url?: string | null;
  is_active?: boolean;
};

export async function createCertificate(
  input: CreateCertificateInput,
): Promise<CommunityCertificate> {
  await requireCommunityEditor();
  const id = crypto.randomUUID();
  const { data, error } = await communityFrom('community_certificates')
    .insert({
      id,
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      template_url: input.template_url?.trim() || null,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAuditEvent({
    action: 'create_certificate',
    entityType: 'community_certificate',
    entityId: id,
  });
  revalidateCommunity();
  return data as CommunityCertificate;
}

export async function awardBadge(userId: string, badgeId: string): Promise<CommunityUserBadge> {
  const session = await requireCommunityEditor();
  const { data: badge, error: badgeError } = await communityFrom('community_badges')
    .select('name')
    .eq('id', badgeId)
    .maybeSingle();
  if (badgeError) throw badgeError;

  const { data, error } = await communityFrom('community_user_badges')
    .upsert(
      {
        id: crypto.randomUUID(),
        user_id: userId,
        badge_id: badgeId,
        awarded_by: session.user.id,
        awarded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,badge_id' },
    )
    .select('*')
    .single();
  if (error) throw error;

  await communityFrom('community_notifications').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: 'badge_awarded',
    title: 'Badge awarded',
    body: badge?.name ? `You earned the ${badge.name} badge.` : 'You earned a new badge.',
    link_path: '/app/recognition',
    created_at: new Date().toISOString(),
  });

  await writeAuditEvent({
    action: 'award_badge',
    entityType: 'community_badge',
    entityId: badgeId,
    payload: { userId },
  });

  revalidateCommunity();
  return data as CommunityUserBadge;
}

export async function awardCertificate(userId: string, certificateId: string) {
  const session = await requireCommunityEditor();
  const { data: certificate, error: certificateError } = await communityFrom(
    'community_certificates',
  )
    .select('name')
    .eq('id', certificateId)
    .maybeSingle();
  if (certificateError) throw certificateError;

  const { data, error } = await communityFrom('community_user_certificates')
    .upsert(
      {
        id: crypto.randomUUID(),
        user_id: userId,
        certificate_id: certificateId,
        awarded_by: session.user.id,
        awarded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,certificate_id' },
    )
    .select('*')
    .single();
  if (error) throw error;

  await communityFrom('community_notifications').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: 'certificate_awarded',
    title: 'Certificate awarded',
    body: certificate?.name
      ? `You received the ${certificate.name} certificate.`
      : 'You received a new certificate.',
    link_path: '/app/recognition',
    created_at: new Date().toISOString(),
  });

  await writeAuditEvent({
    action: 'award_certificate',
    entityType: 'community_certificate',
    entityId: certificateId,
    payload: { userId },
  });

  revalidateCommunity();
  return data;
}

export type CreateGlobalResourceInput = {
  title: string;
  description?: string | null;
  tags?: string[];
  storage_path: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
};

export async function createGlobalResource(
  input: CreateGlobalResourceInput,
): Promise<CommunityResource> {
  const session = await requireCommunityEditor();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const { data, error } = await communityFrom('community_resources')
    .insert({
      id,
      chapter_id: null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      tags: input.tags ?? [],
      storage_path: input.storage_path.trim(),
      mime_type: input.mime_type || null,
      file_size_bytes: input.file_size_bytes ?? null,
      is_global: true,
      uploaded_by: session.user.id,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAuditEvent({
    action: 'create_global_resource',
    entityType: 'community_resource',
    entityId: id,
  });
  revalidateCommunity();
  return data as CommunityResource;
}

export type ManualContributionInput = {
  user_id: string;
  chapter_id?: string | null;
  action_type: string;
  description?: string | null;
  points: number;
};

export async function addManualContribution(
  input: ManualContributionInput,
): Promise<CommunityContribution> {
  const session = await requireCommunityEditor();
  const id = crypto.randomUUID();
  const { data, error } = await communityFrom('community_contributions')
    .insert({
      id,
      user_id: input.user_id,
      chapter_id: input.chapter_id || null,
      action_type: input.action_type.trim(),
      description: input.description?.trim() || null,
      points: input.points,
      metadata: { source: 'manual_admin' },
      recorded_by: session.user.id,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  await writeAuditEvent({
    action: 'add_manual_contribution',
    entityType: 'community_contribution',
    entityId: id,
    payload: { userId: input.user_id, points: input.points },
  });
  revalidateCommunity();
  return data as CommunityContribution;
}
