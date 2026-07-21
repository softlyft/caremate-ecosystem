'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireLeaderAccess } from '@/lib/auth';
import {
  approveMembership,
  listPendingForChapter,
  rejectMembership,
  requestMembership,
} from '@/domains/memberships/repository';
import { createNotification } from '@/domains/notifications/repository';

export async function requestMembershipAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const chapterId = z.string().uuid().parse(formData.get('chapter_id'));
  const membership = await requestMembership(user.id, chapterId);

  revalidatePath('/join');
  revalidatePath('/app/community');
  return membership;
}

export async function listPendingForChapterAction() {
  const session = await requireLeaderAccess();
  return listPendingForChapter(session.activeChapterId);
}

export async function approveMembershipAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const membershipId = z.string().uuid().parse(formData.get('membership_id'));
  const reviewNote = (formData.get('review_note') as string) || null;

  const membership = await approveMembership(
    membershipId,
    session.activeChapterId,
    session.user.id,
    reviewNote,
  );

  await createNotification({
    user_id: membership.user_id,
    type: 'membership_approved',
    title: 'Membership approved',
    body: `You are now a member of ${session.activeChapterName}.`,
    link_path: '/app/dashboard',
  });

  revalidatePath('/app/leader');
  revalidatePath('/app/community');
}

export async function rejectMembershipAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const membershipId = z.string().uuid().parse(formData.get('membership_id'));
  const reviewNote = (formData.get('review_note') as string) || null;

  const membership = await rejectMembership(
    membershipId,
    session.activeChapterId,
    session.user.id,
    reviewNote,
  );

  await createNotification({
    user_id: membership.user_id,
    type: 'membership_rejected',
    title: 'Membership request declined',
    body: reviewNote || `Your request to join ${session.activeChapterName} was declined.`,
    link_path: '/join',
  });

  revalidatePath('/app/leader');
}
