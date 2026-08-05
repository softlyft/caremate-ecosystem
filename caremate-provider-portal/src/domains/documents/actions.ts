'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import { requireProviderSession, requireWriteAccess } from '@/lib/auth';
import { createDocumentSignedUrl, uploadDocument } from '@/domains/documents/repository';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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
  if (file.size > MAX_BYTES) {
    throw new Error('File must be 20 MB or smaller.');
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Unsupported file type. Use PDF, JPEG, PNG, WebP, TXT, or Word.');
  }

  await uploadDocument({
    organizationId: session.activeOrganizationId,
    patientId: parsed.patientId,
    uploadedBy: session.user.id,
    documentType: parsed.documentType,
    title: parsed.title,
    file,
  });

  // Do not revalidate `/app/documents` here — the client resets the form then calls
  // `router.refresh()` so remount cannot race `form.reset()`.
  revalidatePath('/app/dashboard');
  revalidatePath(`/app/patients/${parsed.patientId}`);
  revalidatePath('/app/analytics');
}

/** Open a document via a short-lived signed storage URL (same bucket as the CareMate app). */
export async function openDocumentAction(formData: FormData) {
  const session = await requireProviderSession();
  const documentId = z.string().uuid().parse(formData.get('document_id'));
  const signedUrl = await createDocumentSignedUrl(session.activeOrganizationId, documentId);
  redirect(signedUrl);
}
