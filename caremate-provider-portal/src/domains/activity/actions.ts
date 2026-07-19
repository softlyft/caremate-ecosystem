'use server';

import { revalidatePath } from 'next/cache';
import { requireWriteAccess } from '@/lib/auth';
import { insertActivity } from '@/domains/activity/repository';
import type { Json } from '@/types/database';

export async function logActivityAction(input: {
  patientId: string;
  connectionId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Json;
}) {
  const session = await requireWriteAccess();
  await insertActivity({
    organizationId: session.activeOrganizationId,
    patientId: input.patientId,
    connectionId: input.connectionId,
    eventType: input.eventType,
    summary: input.summary,
    metadata: input.metadata,
  });
  revalidatePath('/app');
}
