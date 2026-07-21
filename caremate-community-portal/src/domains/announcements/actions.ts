'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCommunitySession, requireLeaderAccess } from '@/lib/auth';
import { listApprovedMemberIdsForChapter } from '@/domains/memberships/repository';
import { notifyUsers } from '@/domains/notifications/repository';
import {
  bookmarkAnnouncement,
  createAnnouncement,
  listAnnouncements,
  reactToAnnouncement,
} from '@/domains/announcements/repository';

export async function listAnnouncementsAction() {
  const session = await requireCommunitySession();
  return listAnnouncements(session.activeChapterId);
}

export async function createAnnouncementAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const title = z.string().min(3).parse(formData.get('title'));
  const body = z.string().min(1).parse(formData.get('body'));

  await createAnnouncement({
    chapter_id: session.activeChapterId,
    title,
    body,
    published_by: session.user.id,
  });

  const memberIds = await listApprovedMemberIdsForChapter(session.activeChapterId);
  await notifyUsers(
    memberIds.filter((id) => id !== session.user.id),
    {
      type: 'announcement',
      title: 'New chapter announcement',
      body: title,
      link_path: '/app/community',
    },
  );

  revalidatePath('/app/community');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/leader');
}

export async function reactAnnouncementAction(formData: FormData) {
  const session = await requireCommunitySession();
  const announcementId = z.string().uuid().parse(formData.get('announcement_id'));
  const reaction = z
    .enum(['like', 'celebrate', 'support'])
    .parse(formData.get('reaction') || 'like');

  await reactToAnnouncement(announcementId, session.user.id, reaction);
  revalidatePath('/app/community');
}

export async function bookmarkAnnouncementAction(formData: FormData) {
  const session = await requireCommunitySession();
  const announcementId = z.string().uuid().parse(formData.get('announcement_id'));
  await bookmarkAnnouncement(announcementId, session.user.id);
  revalidatePath('/app/community');
}
