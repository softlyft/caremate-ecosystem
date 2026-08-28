'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import { requirePayerSession, requirePayerWriteAccess } from '@/lib/auth';
import {
  createPayerDocumentSignedUrl,
  uploadPayerDocument,
} from '@/domains/payer-documents/repository';

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

export async function uploadPayerDocumentAction(formData: FormData) {
  const session = await requirePayerWriteAccess();

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

  await uploadPayerDocument({
    payerOrganizationId: session.activeOrganizationId,
    patientId: parsed.patientId,
    uploadedBy: session.user.id,
    documentType: parsed.documentType,
    title: parsed.title,
    file,
  });

  revalidatePath('/payer/dashboard');
  revalidatePath('/payer/documents');
}

export async function openPayerDocumentAction(documentId: string): Promise<{ url: string }> {
  const session = await requirePayerSession();
  const id = z.string().uuid().parse(documentId);
  const url = await createPayerDocumentSignedUrl(session.activeOrganizationId, id);
  return { url };
}
