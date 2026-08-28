import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type { DocumentType, PayerDocument } from '@/types/database';

const DOCUMENTS_BUCKET = 'provider-documents';
const SIGNED_URL_SECONDS = 60 * 15;

export async function listPayerDocuments(
  payerOrganizationId: string,
  options?: { patientId?: string; page?: number; pageSize?: number },
): Promise<PaginatedResult<PayerDocument>> {
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const supabase = await createClient();
  let query = supabase
    .from('payer_documents')
    .select('*', { count: 'exact' })
    .eq('payer_organization_id', payerOrganizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.patientId) {
    query = query.eq('patient_id', options.patientId);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as PayerDocument[], count, page, pageSize);
}

export async function countPayerDocuments(payerOrganizationId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('payer_documents')
    .select('id', { count: 'exact', head: true })
    .eq('payer_organization_id', payerOrganizationId);
  if (error) throw error;
  return count ?? 0;
}

export async function uploadPayerDocument(input: {
  payerOrganizationId: string;
  patientId: string;
  uploadedBy: string;
  documentType: DocumentType;
  title: string;
  file: File;
}): Promise<PayerDocument> {
  const supabase = await createClient();

  const { data: connection, error: connError } = await supabase
    .from('patient_payer_connections')
    .select('id')
    .eq('payer_organization_id', input.payerOrganizationId)
    .eq('patient_id', input.patientId)
    .eq('status', 'approved')
    .maybeSingle();

  if (connError) throw connError;
  if (!connection) throw new Error('Patient is not an approved connection.');

  const documentId = randomUUID();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${input.payerOrganizationId}/${input.patientId}/${documentId}/${safeName}`;

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: input.file.type || 'application/octet-stream',
      upsert: false,
    });

  if (storageError) throw storageError;

  const { data, error } = await supabase
    .from('payer_documents')
    .insert({
      id: documentId,
      payer_organization_id: input.payerOrganizationId,
      patient_id: input.patientId,
      document_type: input.documentType,
      title: input.title,
      file_url: path,
      file_name: input.file.name,
      mime_type: input.file.type || null,
      uploaded_by: input.uploadedBy,
      source: 'payer',
    })
    .select('*')
    .single();

  if (error) throw error;

  await notifyPatientPayerDocumentUpload(supabase, {
    documentId,
    payerOrganizationId: input.payerOrganizationId,
    patientId: input.patientId,
    title: input.title,
  });

  return data as PayerDocument;
}

async function notifyPatientPayerDocumentUpload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: {
    documentId: string;
    payerOrganizationId: string;
    patientId: string;
    title: string;
  },
) {
  try {
    void supabase.functions
      .invoke('notify-provider-document', {
        body: {
          documentId: input.documentId,
          organizationId: input.payerOrganizationId,
          patientId: input.patientId,
          title: input.title,
          orgKind: 'payer',
        },
      })
      .catch(() => {});
  } catch {
    // Best-effort.
  }
}

export async function getPayerDocument(
  payerOrganizationId: string,
  documentId: string,
): Promise<PayerDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payer_documents')
    .select('*')
    .eq('id', documentId)
    .eq('payer_organization_id', payerOrganizationId)
    .maybeSingle();

  if (error) throw error;
  return (data as PayerDocument | null) ?? null;
}

export async function createPayerDocumentSignedUrl(
  payerOrganizationId: string,
  documentId: string,
): Promise<string> {
  const doc = await getPayerDocument(payerOrganizationId, documentId);
  if (!doc?.file_url) {
    throw new Error('Document not found.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.file_url, SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not open document.');
  }

  return data.signedUrl;
}
