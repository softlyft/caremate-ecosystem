'use server';

import { revalidatePath } from 'next/cache';
import { requireWriteAccess } from '@/lib/auth';
import {
  approveConnection,
  rejectConnection,
  requestConnectionByCaremateId,
} from '@/domains/connections/repository';

function revalidateConnectionPaths() {
  revalidatePath('/app/patients');
  revalidatePath('/app/patients/requests');
  revalidatePath('/app/dashboard');
}

export async function approveConnectionAction(connectionId: string, providerNote?: string) {
  const session = await requireWriteAccess();
  await approveConnection(session.activeOrganizationId, connectionId, providerNote);
  revalidateConnectionPaths();
}

export async function rejectConnectionAction(connectionId: string, rejectionReason: string) {
  const session = await requireWriteAccess();
  await rejectConnection(session.activeOrganizationId, connectionId, rejectionReason);
  revalidateConnectionPaths();
}

export async function requestConnectionByCaremateIdAction(formData: FormData) {
  const session = await requireWriteAccess();
  const caremateId = String(formData.get('caremate_id') ?? '').trim();
  const providerNote = String(formData.get('provider_note') ?? '').trim() || null;

  if (!caremateId) {
    throw new Error('CareMate ID is required');
  }

  await requestConnectionByCaremateId(session.activeOrganizationId, caremateId, providerNote);
  revalidateConnectionPaths();
}
