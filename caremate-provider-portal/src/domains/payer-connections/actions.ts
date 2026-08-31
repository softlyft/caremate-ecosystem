'use server';

import { revalidatePath } from 'next/cache';
import { requirePayerWriteAccess, requireWriteAccess } from '@/lib/auth';
import {
  approveProviderPayerConnectionAsPayer,
  approveProviderPayerConnectionAsProvider,
  cancelPendingProviderPayerConnection,
  disconnectProviderPayerConnection,
  rejectProviderPayerConnectionAsPayer,
  rejectProviderPayerConnectionAsProvider,
  requestPayerProviderConnectionByEmail,
  requestProviderPayerConnectionByEmail,
} from '@/domains/payer-connections/repository';

function revalidateProviderPaths() {
  revalidatePath('/app/payers', 'layout');
  revalidatePath('/app/payers/requests');
  revalidatePath('/app/dashboard');
}

function revalidatePayerPaths() {
  revalidatePath('/payer/providers', 'layout');
  revalidatePath('/payer/providers/requests');
  revalidatePath('/payer/dashboard');
}

export async function approvePayerConnectionAsProviderAction(
  connectionId: string,
  providerNote?: string,
) {
  const session = await requireWriteAccess();
  await approveProviderPayerConnectionAsProvider(
    session.activeOrganizationId,
    connectionId,
    providerNote,
  );
  revalidateProviderPaths();
}

export async function rejectPayerConnectionAsProviderAction(
  connectionId: string,
  rejectionReason: string,
) {
  const session = await requireWriteAccess();
  await rejectProviderPayerConnectionAsProvider(
    session.activeOrganizationId,
    connectionId,
    rejectionReason,
  );
  revalidateProviderPaths();
}

export async function requestPayerConnectionByEmailAction(formData: FormData) {
  const session = await requireWriteAccess();
  const claimEmail = String(formData.get('claim_email') ?? '').trim();
  const providerNote = String(formData.get('provider_note') ?? '').trim() || null;

  if (!claimEmail) {
    throw new Error('Payer claim email is required');
  }

  await requestProviderPayerConnectionByEmail(
    session.activeOrganizationId,
    claimEmail,
    providerNote,
  );
  revalidateProviderPaths();
}

export async function approveProviderConnectionAsPayerAction(
  connectionId: string,
  payerNote?: string,
) {
  const session = await requirePayerWriteAccess();
  await approveProviderPayerConnectionAsPayer(
    session.activeOrganizationId,
    connectionId,
    payerNote,
  );
  revalidatePayerPaths();
}

export async function rejectProviderConnectionAsPayerAction(
  connectionId: string,
  rejectionReason: string,
) {
  const session = await requirePayerWriteAccess();
  await rejectProviderPayerConnectionAsPayer(
    session.activeOrganizationId,
    connectionId,
    rejectionReason,
  );
  revalidatePayerPaths();
}

export async function requestProviderConnectionByEmailAction(formData: FormData) {
  const session = await requirePayerWriteAccess();
  const claimEmail = String(formData.get('claim_email') ?? '').trim();
  const payerNote = String(formData.get('payer_note') ?? '').trim() || null;

  if (!claimEmail) {
    throw new Error('Provider claim email is required');
  }

  await requestPayerProviderConnectionByEmail(
    session.activeOrganizationId,
    claimEmail,
    payerNote,
  );
  revalidatePayerPaths();
}

export async function cancelPayerConnectionAsProviderAction(connectionId: string, reason: string) {
  const session = await requireWriteAccess();
  await cancelPendingProviderPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidateProviderPaths();
}

export async function cancelProviderConnectionAsPayerAction(connectionId: string, reason: string) {
  const session = await requirePayerWriteAccess();
  await cancelPendingProviderPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidatePayerPaths();
}

export async function disconnectPayerConnectionAsProviderAction(
  connectionId: string,
  reason?: string,
) {
  const session = await requireWriteAccess();
  await disconnectProviderPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidateProviderPaths();
}

export async function disconnectProviderConnectionAsPayerAction(
  connectionId: string,
  reason?: string,
) {
  const session = await requirePayerWriteAccess();
  await disconnectProviderPayerConnection(
    session.activeOrganizationId,
    connectionId,
    reason,
  );
  revalidatePayerPaths();
}
