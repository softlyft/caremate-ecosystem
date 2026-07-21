'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCommunitySession, requireLeaderAccess } from '@/lib/auth';
import {
  createNotification,
  listUnread,
  markRead,
} from '@/domains/notifications/repository';

export async function listUnreadAction() {
  const session = await requireCommunitySession();
  return listUnread(session.user.id);
}

export async function markReadAction(formData: FormData) {
  const session = await requireCommunitySession();
  const notificationId = z.string().uuid().parse(formData.get('notification_id'));
  const notification = await markRead(notificationId, session.user.id);
  revalidatePath('/app');
  return notification;
}

export async function createNotificationAction(formData: FormData) {
  await requireLeaderAccess();
  const userId = z.string().uuid().parse(formData.get('user_id'));
  const type = z.string().min(1).parse(formData.get('type'));
  const title = z.string().min(1).parse(formData.get('title'));
  const body = (formData.get('body') as string) || null;
  const linkPath = (formData.get('link_path') as string) || null;

  return createNotification({
    user_id: userId,
    type,
    title,
    body,
    link_path: linkPath,
  });
}
