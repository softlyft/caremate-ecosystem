'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import {
  advanceLabOrder,
  createLabOrder,
  createLabTest,
  saveLabItemResult,
} from '@/domains/lab/repository';

export async function createLabTestAction(formData: FormData) {
  const session = await requireWriteAccess();
  const code = String(formData.get('code') || '').trim();
  const name = String(formData.get('name') || '').trim();
  if (!code || !name) throw new Error('Code and name are required');

  await createLabTest({
    organizationId: session.activeOrganizationId,
    code,
    name,
    description: String(formData.get('description') || ''),
    specimenType: String(formData.get('specimen_type') || 'blood'),
    unit: (formData.get('unit') as string) || null,
    referenceRange: (formData.get('reference_range') as string) || null,
  });

  revalidatePath('/app/lab');
  revalidatePath('/app/lab/tests');
}

export async function createLabOrderAction(formData: FormData) {
  const session = await requireWriteAccess();
  const patientId = String(formData.get('patient_id') || '');
  const clinicalNotes = (formData.get('clinical_notes') as string) || null;
  const testIds = formData.getAll('test_definition_id').map(String).filter(Boolean);

  await createLabOrder({
    organizationId: session.activeOrganizationId,
    patientId,
    testDefinitionIds: testIds,
    clinicalNotes,
    orderedBy: session.user.id,
  });

  revalidatePath('/app/lab');
}

export async function advanceLabOrderAction(formData: FormData) {
  const session = await requireWriteAccess();
  const orderId = String(formData.get('order_id') || '');
  if (!orderId) throw new Error('Missing order id');

  await advanceLabOrder({
    organizationId: session.activeOrganizationId,
    orderId,
    userId: session.user.id,
    specimenType: (formData.get('specimen_type') as string) || null,
  });

  revalidatePath('/app/lab');
  revalidatePath(`/app/lab/orders/${orderId}`);
}

const flagSchema = z
  .enum(['normal', 'low', 'high', 'critical', 'abnormal'])
  .optional()
  .nullable();

export async function saveLabResultAction(formData: FormData) {
  const session = await requireWriteAccess();
  const itemId = String(formData.get('item_id') || '');
  const resultValue = String(formData.get('result_value') || '').trim();
  if (!itemId || !resultValue) throw new Error('Result value is required');

  const flagRaw = (formData.get('result_flag') as string) || null;
  const flag = flagRaw ? flagSchema.parse(flagRaw) : null;

  await saveLabItemResult({
    organizationId: session.activeOrganizationId,
    itemId,
    resultValue,
    resultUnit: (formData.get('result_unit') as string) || null,
    referenceRange: (formData.get('reference_range') as string) || null,
    resultFlag: flag,
    resultNotes: (formData.get('result_notes') as string) || null,
  });

  const orderId = String(formData.get('order_id') || '');
  revalidatePath('/app/lab');
  if (orderId) revalidatePath(`/app/lab/orders/${orderId}`);
}
