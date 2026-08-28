import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import {
  gatewayRequest,
  isHealthDataGatewayConfigured,
} from '@/lib/health-data-gateway';
import type { DocumentType, ProviderDocument } from '@/types/database';

const DOCUMENTS_BUCKET = 'provider-documents';
/** Match CareMate mobile signed URL lifetime. */
const SIGNED_URL_SECONDS = 60 * 15;

export async function listDocuments(
  organizationId: string,
  options?: { patientId?: string; page?: number; pageSize?: number },
): Promise<PaginatedResult<ProviderDocument>> {
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const gatewayRows = await gatewayRequest<ProviderDocument[]>(
    'GET',
    `/v1/documents?organizationId=${encodeURIComponent(organizationId)}`,
  );

  if (gatewayRows) {
    let rows = gatewayRows;
    if (options?.patientId) {
      rows = rows.filter((r) => r.patient_id === options.patientId);
    }
    rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const slice = rows.slice(from, to + 1);
    return paginatedResult(slice, rows.length, page, pageSize);
  }

  if (isHealthDataGatewayConfigured()) {
    return emptyPage(page, pageSize);
  }

  const supabase = await createClient();
  let query = supabase
    .from('provider_documents')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.patientId) {
    query = query.eq('patient_id', options.patientId);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderDocument[], count, page, pageSize);
}

export async function countDocuments(organizationId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('provider_documents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (error) throw error;
  return count ?? 0;
}

export async function uploadDocument(input: {
  organizationId: string;
  patientId: string;
  uploadedBy: string;
  documentType: DocumentType;
  title: string;
  file: File;
}): Promise<ProviderDocument> {
  const supabase = await createClient();

  // Ensure approved connection
  const { data: connection, error: connError } = await supabase
    .from('patient_provider_connections')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('patient_id', input.patientId)
    .eq('status', 'approved')
    .maybeSingle();

  if (connError) throw connError;
  if (!connection) throw new Error('Patient is not an approved connection.');

  const documentId = randomUUID();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${input.organizationId}/${input.patientId}/${documentId}/${safeName}`;

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error: storageError } = await supabase.storage
    .from('provider-documents')
    .upload(path, buffer, {
      contentType: input.file.type || 'application/octet-stream',
      upsert: false,
    });

  if (storageError) throw storageError;

  const gatewayRow = await gatewayRequest<ProviderDocument>('PUT', '/v1/documents', {
    id: documentId,
    organization_id: input.organizationId,
    patient_id: input.patientId,
    document_type: input.documentType,
    title: input.title,
    file_url: path,
    file_name: input.file.name,
    mime_type: input.file.type || null,
    uploaded_by: input.uploadedBy,
    source: 'provider',
  });

  if (gatewayRow) {
    await insertActivity({
      organizationId: input.organizationId,
      patientId: input.patientId,
      connectionId: connection.id,
      eventType: 'document_uploaded',
      summary: `Document uploaded: ${input.title}`,
      metadata: { document_id: documentId, document_type: input.documentType },
    });
    await notifyPatientDocumentUpload(supabase, {
      documentId,
      organizationId: input.organizationId,
      patientId: input.patientId,
      title: input.title,
    });
    return gatewayRow;
  }

  const { data, error } = await supabase
    .from('provider_documents')
    .insert({
      id: documentId,
      organization_id: input.organizationId,
      patient_id: input.patientId,
      document_type: input.documentType,
      title: input.title,
      file_url: path,
      file_name: input.file.name,
      mime_type: input.file.type || null,
      uploaded_by: input.uploadedBy,
      source: 'provider',
    })
    .select('*')
    .single();

  if (error) throw error;

  await insertActivity({
    organizationId: input.organizationId,
    patientId: input.patientId,
    connectionId: connection.id,
    eventType: 'document_uploaded',
    summary: `Document uploaded: ${input.title}`,
    metadata: { document_id: documentId, document_type: input.documentType },
  });

  await notifyPatientDocumentUpload(supabase, {
    documentId,
    organizationId: input.organizationId,
    patientId: input.patientId,
    title: input.title,
  });

  return data as ProviderDocument;
}

async function notifyPatientDocumentUpload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: {
    documentId: string;
    organizationId: string;
    patientId: string;
    title: string;
  },
) {
  try {
    void supabase.functions
      .invoke('notify-provider-document', {
        body: {
          documentId: input.documentId,
          organizationId: input.organizationId,
          patientId: input.patientId,
          title: input.title,
        },
      })
      .catch(() => {
        // In-app + push are best-effort.
      });
  } catch {
    // In-app + push are best-effort.
  }
}

/**
 * Load a single document for the active org (gateway metadata or Supabase row).
 */
export async function getDocument(
  organizationId: string,
  documentId: string,
): Promise<ProviderDocument | null> {
  const gatewayRow = await gatewayRequest<ProviderDocument>(
    'GET',
    `/v1/documents/${encodeURIComponent(documentId)}`,
  );

  if (gatewayRow) {
    if (gatewayRow.organization_id !== organizationId) {
      return null;
    }
    return gatewayRow;
  }

  if (isHealthDataGatewayConfigured()) {
    // Fallback when GET-by-id is unavailable: resolve from the org list (same source as Recent Uploads).
    const gatewayRows = await gatewayRequest<ProviderDocument[]>(
      'GET',
      `/v1/documents?organizationId=${encodeURIComponent(organizationId)}`,
    );
    return gatewayRows?.find((row) => row.id === documentId) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_documents')
    .select('*')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProviderDocument | null) ?? null;
}

/**
 * Create a short-lived signed URL so staff can open/preview the stored file.
 */
export async function createDocumentSignedUrl(
  organizationId: string,
  documentId: string,
): Promise<string> {
  const doc = await getDocument(organizationId, documentId);
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
