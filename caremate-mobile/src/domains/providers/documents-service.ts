import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  fetchDocumentsViaGateway,
  isHealthDataGatewayConfigured,
  scrubEncryptedText,
  upsertDocumentViaGateway,
} from '@/domains/health-data-gateway';
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

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function mimeToExt(mimeType: string | null | undefined): string {
  if (!mimeType) {
    return 'bin';
  }
  return MIME_EXT[mimeType.toLowerCase()] ?? 'bin';
}

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
  throw new Error('Use a PDF, JPG, PNG, DOC, or DOCX file');
}

class ProviderDocumentsService {
  async listMine(): Promise<ProviderDocument[]> {
    const gatewayRows = await fetchDocumentsViaGateway();
    let rows: RemoteDocumentRow[];

    if (gatewayRows) {
      rows = gatewayRows.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        patient_id: row.patient_id,
        document_type: row.document_type as ProviderDocumentType,
        title: scrubEncryptedText(row.title) ?? '',
        file_url: row.file_url,
        file_name: scrubEncryptedText(row.file_name),
        mime_type: row.mime_type,
        source: row.source,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
      }));
    } else if (isHealthDataGatewayConfigured()) {
      return [];
    } else {
      const { data, error } = await supabase
        .from('provider_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      rows = ((data ?? []) as RemoteDocumentRow[]).map((row) => ({
        ...row,
        title: scrubEncryptedText(row.title) ?? '',
        file_name: scrubEncryptedText(row.file_name),
      }));
    }

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

  /**
   * Download a document into the app cache for reliable in-app preview.
   * Avoids opening an external browser (which often fails on signed storage URLs).
   */
  async prepareLocalPreview(doc: ProviderDocument): Promise<{
    uri: string;
    remoteUrl: string;
    mimeType: string | null;
    fileName: string | null;
    title: string;
  }> {
    const remoteUrl = await this.createViewUrl(doc.filePath);
    const ext = doc.fileName?.includes('.')
      ? doc.fileName.slice(doc.fileName.lastIndexOf('.') + 1)
      : mimeToExt(doc.mimeType);
    const safeExt = (ext || 'bin').replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('Could not access document cache');
    }
    const target = `${cacheDir}provider-doc-${doc.id}.${safeExt}`;

    const result = await FileSystem.downloadAsync(remoteUrl, target);
    if (result.status < 200 || result.status >= 300) {
      throw new Error('Could not download document');
    }

    return {
      uri: result.uri,
      remoteUrl,
      mimeType: doc.mimeType ?? result.headers?.['Content-Type'] ?? null,
      fileName: doc.fileName,
      title: doc.title,
    };
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
      throw new Error('File must be 3 MB or smaller');
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

    try {
      const gatewayRow = await upsertDocumentViaGateway({
        id: documentId,
        organizationId,
        patientId: userId,
        documentType: params.documentType,
        title,
        fileUrl: path,
        fileName,
        mimeType,
        uploadedBy: userId,
        source: 'patient',
      });

      if (gatewayRow) {
        const names = organizationId
          ? await loadOrganizationNames([organizationId])
          : new Map<string, string>();
        return mapRow(
          {
            id: gatewayRow.id,
            organization_id: gatewayRow.organization_id,
            patient_id: gatewayRow.patient_id,
            document_type: gatewayRow.document_type as ProviderDocumentType,
            title: gatewayRow.title,
            file_url: gatewayRow.file_url,
            file_name: gatewayRow.file_name,
            mime_type: gatewayRow.mime_type,
            source: gatewayRow.source,
            created_at: gatewayRow.created_at ?? new Date().toISOString(),
            updated_at: gatewayRow.updated_at ?? new Date().toISOString(),
          },
          organizationId ? (names.get(organizationId) ?? null) : null,
        );
      }
    } catch (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }

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
