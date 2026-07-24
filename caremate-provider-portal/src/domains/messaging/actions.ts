'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import { replyOrgMessage } from '@/domains/messaging/repository';

const replySchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1, 'Message is required'),
});

export async function replyOrgMessageAction(formData: FormData) {
  const session = await requireWriteAccess();

  const parsed = replySchema.parse({
    conversationId: formData.get('conversation_id'),
    body: formData.get('body'),
  });

  await replyOrgMessage({
    organizationId: session.activeOrganizationId,
    conversationId: parsed.conversationId,
    body: parsed.body,
  });

  revalidatePath('/app/broadcasts');
  revalidatePath(`/app/broadcasts/${parsed.conversationId}`);
  revalidatePath('/app/dashboard');
}
