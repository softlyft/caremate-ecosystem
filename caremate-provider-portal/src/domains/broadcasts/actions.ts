'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import { sendOrgMessage } from '@/domains/messaging/repository';

const sendSchema = z.object({
  title: z.string().optional().nullable(),
  message: z.string().min(1, 'Message is required'),
  audience: z.enum(['all', 'selected']),
  patientIds: z.array(z.string().uuid()).optional(),
  expiresAt: z.string().optional().nullable(),
});

export async function sendBroadcastAction(formData: FormData) {
  const session = await requireWriteAccess();

  const audience = String(formData.get('audience') || 'all') as 'all' | 'selected';
  const patientIdsRaw = formData.get('patient_ids');
  let patientIds: string[] = [];
  if (typeof patientIdsRaw === 'string' && patientIdsRaw.trim()) {
    patientIds = patientIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const parsed = sendSchema.parse({
    title: formData.get('title'),
    message: formData.get('message'),
    audience,
    patientIds: audience === 'selected' ? patientIds : undefined,
    expiresAt: formData.get('expires_at') || null,
  });

  if (parsed.audience === 'selected' && !parsed.patientIds?.length) {
    throw new Error('Select at least one patient for a targeted message.');
  }

  const result = await sendOrgMessage({
    organizationId: session.activeOrganizationId,
    body: parsed.message,
    subject: parsed.title?.trim() || null,
    audience: parsed.audience,
    patientIds: parsed.patientIds,
    expiresAt: parsed.expiresAt,
  });

  if (!result.recipientCount) {
    throw new Error('No approved recipients.');
  }

  // Client resets the compose form then `router.refresh()` — avoid remount race on this path.
  revalidatePath('/app/dashboard');
  revalidatePath('/app/analytics');
  revalidatePath('/app/patients');
}
