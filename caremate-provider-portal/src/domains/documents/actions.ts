'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import { requireWriteAccess } from '@/lib/auth';
import { uploadDocument } from '@/domains/documents/repository';

const metaSchema = z.object({
  patientId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  title: z.string().min(1, 'Title is required'),
});

export async function uploadDocumentAction(formData: FormData) {
  const session = await requireWriteAccess();

  const parsed = metaSchema.parse({
    patientId: formData.get('patient_id'),
    documentType: formData.get('document_type'),
    title: formData.get('title'),
  });

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a file to upload.');
  }

  await uploadDocument({
    organizationId: session.activeOrganizationId,
    patientId: parsed.patientId,
    uploadedBy: session.user.id,
    documentType: parsed.documentType,
    title: parsed.title,
    file,
  });

  revalidatePath('/app/documents');
  revalidatePath('/app/dashboard');
  revalidatePath(`/app/patients/${parsed.patientId}`);
  revalidatePath('/app/analytics');
}
