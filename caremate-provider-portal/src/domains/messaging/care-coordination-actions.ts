'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import { addCareCoordinationStaff } from '@/domains/messaging/care-coordination';

const schema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function addCareCoordinationStaffAction(formData: FormData) {
  await requireWriteAccess();

  const parsed = schema.parse({
    conversationId: formData.get('conversation_id'),
    userId: formData.get('user_id'),
  });

  await addCareCoordinationStaff(parsed.conversationId, parsed.userId);

  revalidatePath('/app/broadcasts');
  revalidatePath(`/app/broadcasts/${parsed.conversationId}`);
}
