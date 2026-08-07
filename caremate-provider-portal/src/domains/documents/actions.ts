'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import { requireProviderSession, requireWriteAccess } from '@/lib/auth';
import { createDocumentSignedUrl, uploadDocument } from '@/domains/documents/repository';

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

function resolveUploadMime(file: File): string | null {
  const normalized = (file.type || '').trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream' && ALLOWED_MIME.has(normalized)) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  }
  return EXT_MIME[extensionOf(file.name)] ?? null;
}

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
    throw new Error('File must be 3 MB or smaller.');
  }
  if (!resolveUploadMime(file)) {
    throw new Error('Unsupported file type. Use PDF, JPG, PNG, DOC, or DOCX.');
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

/**
 * Return a short-lived Storage signed URL for the document.
 * Callers must open the URL in the browser — do not `redirect()` to an external
 * Supabase host from a Server Action (Next 15 mishandles that and hits error.tsx).
 */
export async function openDocumentAction(documentId: string): Promise<{ url: string }> {
  const session = await requireProviderSession();
  const id = z.string().uuid().parse(documentId);
  const url = await createDocumentSignedUrl(session.activeOrganizationId, id);
  return { url };
}
