import { createClient } from '@/lib/supabase/server';
import type { CommunityMembership, MembershipStatus } from '@/types/database';

export async function requestMembership(
  userId: string,
  chapterId: string,
): Promise<CommunityMembership> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_memberships')
    .upsert(
      {
        user_id: userId,
        chapter_id: chapterId,
        role: 'member',
        status: 'pending',
        review_note: null,
        reviewed_by: null,
        reviewed_at: null,
      },
      { onConflict: 'user_id,chapter_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityMembership;
}

async function reviewMembership(
  membershipId: string,
  chapterId: string,
  reviewerId: string,
  status: Extract<MembershipStatus, 'approved' | 'rejected'>,
  reviewNote?: string | null,
): Promise<CommunityMembership> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_memberships')
    .update({
      status,
      review_note: reviewNote ?? null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .eq('chapter_id', chapterId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityMembership;
}

export async function approveMembership(
  membershipId: string,
  chapterId: string,
  reviewerId: string,
  reviewNote?: string | null,
): Promise<CommunityMembership> {
  return reviewMembership(membershipId, chapterId, reviewerId, 'approved', reviewNote);
}

export async function rejectMembership(
  membershipId: string,
  chapterId: string,
  reviewerId: string,
  reviewNote?: string | null,
): Promise<CommunityMembership> {
  return reviewMembership(membershipId, chapterId, reviewerId, 'rejected', reviewNote);
}

export async function listApprovedMemberIdsForChapter(chapterId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_memberships')
    .select('user_id')
    .eq('chapter_id', chapterId)
    .eq('status', 'approved');

  if (error) throw error;
  return (data ?? []).map((row) => row.user_id).filter(Boolean) as string[];
}

export async function listPendingForChapter(
  chapterId: string,
): Promise<CommunityMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_memberships')
    .select('*')
    .eq('chapter_id', chapterId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommunityMembership[];
}
