import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuthStore } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';
import { createId } from '@/utils/helpers';

export const PROVIDER_DOCUMENT_TYPES = [
  'prescription',
  'lab_result',
  'imaging_report',
  'referral_letter',
  'discharge_summary',
  'invoice',
] as const;

export type ProviderDocumentType = (typeof PROVIDER_DOCUMENT_TYPES)[number];
export type ProviderDocumentSource = 'provider' | 'patient';

export type ProviderDocument = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  patientId: string;
  documentType: ProviderDocumentType;
  title: string;
  filePath: string;
  fileName: string | null;
  mimeType: string | null;
  source: ProviderDocumentSource;
  createdAt: string;
  updatedAt: string;
};

export type DocumentOrgOption = {
  organizationId: string;
  name: string;
};

type RemoteDocumentRow = {
  id: string;
  organization_id: string | null;
  patient_id: string;
  document_type: ProviderDocumentType;
  title: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  source: ProviderDocumentSource;
  created_at: string;
  updated_at: string;
};

const BUCKET = 'provider-documents';
const SIGNED_URL_SECONDS = 60 * 15;
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

async function loadOrganizationNames(organizationIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(organizationIds.filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('provider_organizations')
    .select('id, name')
    .in('id', unique);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id as string, (row.name as string) ?? 'Provider']));
}

function mapRow(row: RemoteDocumentRow, organizationName: string | null): ProviderDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName,
    patientId: row.patient_id,
    documentType: row.document_type,
    title: row.title,
    filePath: row.file_url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    source: row.source ?? 'provider',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireUserId(): string {
  const userId = useAuthStore.getState().user?.id;
  if (!userId || useAuthStore.getState().isGuest) {
    throw new Error('Sign in to manage documents');
  }
  return userId;
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document';
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts.at(-1) ?? '') : '';
}

function resolveMimeType(fileName: string, mimeType: string | null | undefined): string {
  const normalized = (mimeType ?? '').trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream' && ALLOWED_MIME.has(normalized)) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  }
  const fromExt = EXT_MIME[extensionOf(fileName)];
  if (fromExt) {
    return fromExt;
  }
  throw new Error('Use a PDF, Word, JPEG, PNG, or WebP file');
}

class ProviderDocumentsService {
  async listMine(): Promise<ProviderDocument[]> {
    const { data, error } = await supabase
      .from('provider_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as RemoteDocumentRow[];
    const names = await loadOrganizationNames(
      rows.map((r) => r.organization_id).filter((id): id is string => Boolean(id)),
    );
    return rows.map((row) =>
      mapRow(row, row.organization_id ? (names.get(row.organization_id) ?? null) : null),
    );
  }

  /** Approved connections the patient can tag / share a document with. */
  async listLinkableOrganizations(): Promise<DocumentOrgOption[]> {
    const userId = requireUserId();
    const { data, error } = await supabase
      .from('patient_provider_connections')
      .select('organization_id')
      .eq('patient_id', userId)
      .eq('status', 'approved');

    if (error) {
      throw error;
    }

    const orgIds = [...new Set((data ?? []).map((r) => r.organization_id as string))];
    if (orgIds.length === 0) {
      return [];
    }

    const names = await loadOrganizationNames(orgIds);
    return orgIds
      .map((organizationId) => ({
        organizationId,
        name: names.get(organizationId) ?? 'Provider',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createViewUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_SECONDS);

    if (error || !data?.signedUrl) {
      throw error ?? new Error('Could not open document');
    }

    return data.signedUrl;
  }

  async pickAndUpload(params: {
    title: string;
    documentType: ProviderDocumentType;
    organizationId?: string | null;
  }): Promise<ProviderDocument> {
    const userId = requireUserId();
    const title = params.title.trim();
    if (!title) {
      throw new Error('Enter a document title');
    }

    // Pick broadly, then validate — Android MIME filters are unreliable.
    const picked = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled || !picked.assets?.[0]) {
      throw new Error('UPLOAD_CANCELLED');
    }

    const asset = picked.assets[0];
    const fileName = asset.name || 'document';
    const mimeType = resolveMimeType(fileName, asset.mimeType);

    if (asset.size != null && asset.size > MAX_BYTES) {
      throw new Error('File must be 15 MB or smaller');
    }

    const documentId = await createId();
    const path = `patient/${userId}/${documentId}/${safeFileName(fileName)}`;

    // React Native: Blob/FormData uploads to Supabase Storage are unreliable.
    // Read bytes via FileSystem and upload an ArrayBuffer (Supabase-recommended).
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) {
      throw new Error('Could not read the selected file');
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(base64), {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      throw storageError;
    }

    const organizationId = params.organizationId?.trim() || null;

    const { data, error } = await supabase
      .from('provider_documents')
      .insert({
        id: documentId,
        organization_id: organizationId,
        patient_id: userId,
        document_type: params.documentType,
        title,
        file_url: path,
        file_name: fileName,
        mime_type: mimeType,
        uploaded_by: userId,
        source: 'patient',
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }

    const row = data as RemoteDocumentRow;
    const names = organizationId
      ? await loadOrganizationNames([organizationId])
      : new Map<string, string>();
    return mapRow(row, organizationId ? (names.get(organizationId) ?? null) : null);
  }

  async updateOrganization(
    documentId: string,
    organizationId: string | null,
  ): Promise<ProviderDocument> {
    requireUserId();

    const { data, error } = await supabase
      .from('provider_documents')
      .update({ organization_id: organizationId })
      .eq('id', documentId)
      .eq('source', 'patient')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const row = data as RemoteDocumentRow;
    const names = row.organization_id
      ? await loadOrganizationNames([row.organization_id])
      : new Map<string, string>();
    return mapRow(row, row.organization_id ? (names.get(row.organization_id) ?? null) : null);
  }
}

export const providerDocumentsService = new ProviderDocumentsService();
