'use server';

import { revalidatePath } from 'next/cache';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';

export type IngestResource = 'organization' | 'location' | 'healthcareservice';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

function ingestConfig() {
  const baseUrl = process.env.PROVIDER_INGEST_URL?.replace(/\/$/, '');
  const apiKey = process.env.PROVIDER_INGEST_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      'Provider ingest is not configured. Set PROVIDER_INGEST_URL and PROVIDER_INGEST_API_KEY.'
    );
  }
  return { baseUrl, apiKey };
}

export type IngestAccepted = {
  job_id: string;
  status: string;
  resource?: string;
};

export type IngestJobStatus = {
  job_id: string;
  status: string;
  filename: string;
  source: string;
  created_at: string;
  updated_at: string;
  providers_upserted: number;
  error: string | null;
  details: Record<string, unknown>;
};

export async function uploadProvidersFile(formData: FormData): Promise<IngestAccepted> {
  await requireEditor();
  const { baseUrl, apiKey } = ingestConfig();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a .xlsx file to upload.');
  }

  const MAX_INGEST_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_INGEST_BYTES) {
    throw new Error('Ingest file must be 25 MB or smaller.');
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('File must be .xlsx');
  }

  const resourceRaw = formData.get('resource');
  const resource = (typeof resourceRaw === 'string' ? resourceRaw : 'organization') as IngestResource;
  if (!['organization', 'location', 'healthcareservice'].includes(resource)) {
    throw new Error('Invalid ingest resource');
  }

  const body = new FormData();
  body.append('file', file, file.name);
  body.append('source', 'csv_ingest');

  const response = await fetch(`${baseUrl}/v1/ingest/${resource}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Ingest failed (${response.status})`);
  }

  const accepted = (await response.json()) as IngestAccepted;
  await writeAuditEvent({
    action: `ingest_provider_${resource}`,
    entityType: 'provider',
    entityId: accepted.job_id,
    payload: { filename: file.name, status: accepted.status, resource },
  });

  revalidatePath('/dashboard/providers');
  return accepted;
}

export async function getIngestJob(jobId: string): Promise<IngestJobStatus> {
  await requireEditor();
  const { baseUrl, apiKey } = ingestConfig();
  const response = await fetch(`${baseUrl}/v1/jobs/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Job lookup failed (${response.status})`);
  }
  return (await response.json()) as IngestJobStatus;
}

export async function archiveProvider(id: string) {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('providers')
    .update({ deleted_at: now, active: false, updated_at: now })
    .eq('id', id);
  if (error) throw error;
  await writeAuditEvent({ action: 'archive_provider', entityType: 'provider', entityId: id });
  revalidatePath('/dashboard/providers');
  revalidatePath(`/dashboard/providers/${id}`);
}
