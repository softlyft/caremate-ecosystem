'use server';

import { revalidatePath } from 'next/cache';
import { requirePayerWriteAccess } from '@/lib/auth';
import {
  approvePatientPayerConnectionAsPayer,
  cancelPendingPatientPayerConnection,
  disconnectPatientPayerConnection,
  rejectPatientPayerConnectionAsPayer,
  requestPatientPayerConnectionByCaremateId,
} from '@/domains/patient-payer-connections/repository';

function revalidatePatientPayerPaths() {
  revalidatePath('/payer/patients', 'layout');
  revalidatePath('/payer/patients/requests');
  revalidatePath('/payer/dashboard');
}

export async function approvePatientConnectionAsPayerAction(
  connectionId: string,
  payerNote?: string,
) {
  const session = await requirePayerWriteAccess();
  await approvePatientPayerConnectionAsPayer(
    session.activeOrganizationId,
    connectionId,
    payerNote,
  );
  revalidatePatientPayerPaths();
}

export async function rejectPatientConnectionAsPayerAction(
  connectionId: string,
  rejectionReason: string,
) {
  const session = await requirePayerWriteAccess();
  await rejectPatientPayerConnectionAsPayer(
    session.activeOrganizationId,
    connectionId,
    rejectionReason,
  );
  revalidatePatientPayerPaths();
}

export async function cancelPatientConnectionAsPayerAction(connectionId: string, reason: string) {
  const session = await requirePayerWriteAccess();
  await cancelPendingPatientPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidatePatientPayerPaths();
}

export async function disconnectPatientConnectionAsPayerAction(
  connectionId: string,
  reason?: string,
) {
  const session = await requirePayerWriteAccess();
  await disconnectPatientPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidatePatientPayerPaths();
}

export async function requestPatientConnectionByCaremateIdAction(formData: FormData) {
  const session = await requirePayerWriteAccess();
  const caremateId = String(formData.get('caremate_id') ?? '').trim();
  const payerNote = String(formData.get('payer_note') ?? '').trim() || null;

  if (!caremateId) {
    throw new Error('CareMate ID is required');
  }

  await requestPatientPayerConnectionByCaremateId(
    session.activeOrganizationId,
    caremateId,
    payerNote,
  );
  revalidatePatientPayerPaths();
}
