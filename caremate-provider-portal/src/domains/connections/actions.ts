'use server';

import { revalidatePath } from 'next/cache';
import { requireWriteAccess } from '@/lib/auth';
import { logConnectionAction } from '@/domains/connections/debug-log';
import {
  approveConnection,
  cancelPendingConnection,
  disconnectConnection,
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
  logConnectionAction('approve', {
    phase: 'action_start',
    connectionId,
    organizationId: session.activeOrganizationId,
    userId: session.user.id,
    role: session.activeRole,
  });
  try {
    await approveConnection(session.activeOrganizationId, connectionId, providerNote);
    revalidateConnectionPaths();
  } catch (err) {
    logConnectionAction('approve', {
      phase: 'action_error',
      connectionId,
      organizationId: session.activeOrganizationId,
      userId: session.user.id,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function rejectConnectionAction(connectionId: string, rejectionReason: string) {
  const session = await requireWriteAccess();
  await rejectConnection(session.activeOrganizationId, connectionId, rejectionReason);
  revalidateConnectionPaths();
}

export async function cancelPendingConnectionAction(connectionId: string, reason: string) {
  const session = await requireWriteAccess();
  await cancelPendingConnection(session.activeOrganizationId, connectionId, reason);
  revalidateConnectionPaths();
}

export async function disconnectConnectionAction(connectionId: string, reason?: string) {
  const session = await requireWriteAccess();
  await disconnectConnection(session.activeOrganizationId, connectionId, reason);
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
