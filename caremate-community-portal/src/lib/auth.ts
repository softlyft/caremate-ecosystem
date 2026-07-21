import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { canManageChapter, isCommunityRole, isLeaderRole } from '@/constants/roles';
import { ACTIVE_CHAPTER_COOKIE } from '@/constants/cookies';
import { createClient } from '@/lib/supabase/server';
import type { MembershipRole } from '@/types/database';

export type CommunityMembershipSummary = {
  id: string;
  chapterId: string;
  chapterName: string;
  role: MembershipRole;
};

export type CommunitySession = {
  user: User;
  memberships: CommunityMembershipSummary[];
  activeChapterId: string;
  activeChapterName: string;
  activeRole: MembershipRole;
  isLeader: boolean;
};

export async function getCommunitySession(): Promise<CommunitySession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: members, error } = await supabase
    .from('community_memberships')
    .select('id, chapter_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'approved');

  if (error || !members?.length) return null;

  const chapterIds = members.map((m) => m.chapter_id);
  const { data: chapters } = await supabase
    .from('community_chapters')
    .select('id, name')
    .in('id', chapterIds);

  const chapterNameById = new Map((chapters ?? []).map((c) => [c.id, c.name]));

  const memberships: CommunityMembershipSummary[] = members
    .filter((m) => isCommunityRole(m.role))
    .map((m) => ({
      id: m.id,
      chapterId: m.chapter_id,
      chapterName: chapterNameById.get(m.chapter_id) ?? 'Chapter',
      role: m.role as MembershipRole,
    }));

  if (!memberships.length) return null;

  const cookieStore = await cookies();
  const cookieChapter = cookieStore.get(ACTIVE_CHAPTER_COOKIE)?.value;
  const active =
    memberships.find((m) => m.chapterId === cookieChapter) ?? memberships[0];

  return {
    user,
    memberships,
    activeChapterId: active.chapterId,
    activeChapterName: active.chapterName,
    activeRole: active.role,
    isLeader: isLeaderRole(active.role),
  };
}

export async function requireCommunitySession(): Promise<CommunitySession> {
  const session = await getCommunitySession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireLeaderAccess(): Promise<CommunitySession> {
  const session = await requireCommunitySession();
  if (!canManageChapter(session.activeRole)) {
    throw new Error('Forbidden');
  }
  return session;
}
