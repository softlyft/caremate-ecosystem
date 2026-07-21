'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCommunitySession, requireLeaderAccess } from '@/lib/auth';
import { addGalleryItem, listGallery } from '@/domains/gallery/repository';

export async function listGalleryAction() {
  const session = await requireCommunitySession();
  return listGallery(session.activeChapterId);
}

export async function addGalleryItemAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const imageUrl = z.string().url().parse(formData.get('image_url'));
  const caption = (formData.get('caption') as string) || null;
  const eventIdRaw = (formData.get('event_id') as string) || null;
  const eventId = eventIdRaw ? z.string().uuid().parse(eventIdRaw) : null;

  await addGalleryItem({
    chapter_id: session.activeChapterId,
    image_url: imageUrl,
    caption,
    event_id: eventId,
    uploaded_by: session.user.id,
  });

  revalidatePath('/app/community');
  revalidatePath('/app/leader');
}
