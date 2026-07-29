'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPES } from '@/constants/content';
import { writeAuditEvent } from '@/lib/audit';
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit-catalog';
import { createClient } from '@/lib/supabase/server';
import {
  createHealthcareService,
  createLocation,
  createOrganization,
  getProviderHealthcareService,
  getProviderLocation,
  getProviderOrganization,
  listLocationsForOrganization,
  rebuildLocationProjection,
  rebuildProjectionsForOrganization,
  softDeleteHealthcareService,
  softDeleteLocation,
  softDeleteOrganization,
  updateHealthcareService,
  updateLocation,
  updateOrganization,
  getOrganizationContactEmail,
  syncOrganizationContactEmail,
} from '@/domains/providers/repository';

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
  await writeAuditEvent({
    action: AUDIT_ACTION.archiveProvider,
    entityType: AUDIT_ENTITY.provider,
    entityId: id,
  });
  revalidatePath('/dashboard/providers');
  revalidatePath(`/dashboard/providers/${id}`);
}

const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  active: z.enum(['true', 'false']).default('true'),
});

const locationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  status: z.enum(['active', 'inactive']).default('active'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  organization_id: z.string().uuid(),
});

const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  active: z.enum(['true', 'false']).default('true'),
  service_type: z.enum(PROVIDER_TYPES).optional().or(z.literal('')),
  location_id: z.string().uuid(),
  organization_id: z.string().uuid(),
});

function parseOptionalNumber(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function revalidateOrgTree(organizationId: string, locationId?: string) {
  revalidatePath('/dashboard/providers');
  revalidatePath(`/dashboard/providers/organizations/${organizationId}`);
  if (locationId) {
    revalidatePath(
      `/dashboard/providers/organizations/${organizationId}/locations/${locationId}`,
    );
  }
}

export async function createOrganizationAction(formData: FormData) {
  await requireEditor();
  const parsed = organizationSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
  });
  const org = await createOrganization({
    name: parsed.name,
    active: parsed.active === 'true',
  });
  await writeAuditEvent({
    action: AUDIT_ACTION.createProviderOrganization,
    entityType: AUDIT_ENTITY.providerOrganization,
    entityId: org.id,
    payload: { name: org.name },
  });
  revalidateOrgTree(org.id);
  return { id: org.id };
}

export async function updateOrganizationAction(organizationId: string, formData: FormData) {
  await requireEditor();
  const existing = await getProviderOrganization(organizationId);
  if (!existing || existing.deleted_at) throw new Error('Organization not found');

  const parsed = organizationSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
  });
  await updateOrganization(organizationId, {
    name: parsed.name,
    active: parsed.active === 'true',
  });
  await rebuildProjectionsForOrganization(organizationId);
  await writeAuditEvent({
    action: AUDIT_ACTION.updateProviderOrganization,
    entityType: AUDIT_ENTITY.providerOrganization,
    entityId: organizationId,
  });
  revalidateOrgTree(organizationId);
}

export async function updateOrganizationContactEmailAction(
  organizationId: string,
  formData: FormData,
) {
  await requireEditor();
  const email = z.string().email().parse(String(formData.get('email') ?? '').trim());
  await syncOrganizationContactEmail(organizationId, email);
  await writeAuditEvent({
    action: AUDIT_ACTION.updateProviderContactEmail,
    entityType: AUDIT_ENTITY.providerOrganization,
    entityId: organizationId,
    payload: { email },
  });
  revalidateOrgTree(organizationId);
}

export async function archiveOrganizationAction(organizationId: string) {
  await requireEditor();
  const existing = await getProviderOrganization(organizationId);
  if (!existing || existing.deleted_at) throw new Error('Organization not found');

  const locations = await listLocationsForOrganization(organizationId);
  for (const loc of locations) {
    await softDeleteLocation(loc.id);
    await rebuildLocationProjection(loc.id);
  }
  await softDeleteOrganization(organizationId);
  await writeAuditEvent({
    action: AUDIT_ACTION.archiveProviderOrganization,
    entityType: AUDIT_ENTITY.providerOrganization,
    entityId: organizationId,
  });
  revalidateOrgTree(organizationId);
}

export async function createLocationAction(formData: FormData) {
  await requireEditor();
  const parsed = locationSchema.parse({
    name: formData.get('name'),
    status: formData.get('status') || 'active',
    address: formData.get('address') || null,
    phone: formData.get('phone') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null,
    organization_id: formData.get('organization_id'),
  });

  const org = await getProviderOrganization(parsed.organization_id);
  if (!org || org.deleted_at) throw new Error('Organization not found');

  const contactEmail = await getOrganizationContactEmail(parsed.organization_id);
  const location = await createLocation(parsed.organization_id, {
    name: parsed.name,
    status: parsed.status,
    address: parsed.address,
    phone: parsed.phone,
    email: contactEmail,
    latitude: parseOptionalNumber(parsed.latitude),
    longitude: parseOptionalNumber(parsed.longitude),
  });
  await rebuildLocationProjection(location.id);
  await writeAuditEvent({
    action: AUDIT_ACTION.createProviderLocation,
    entityType: AUDIT_ENTITY.providerLocation,
    entityId: location.id,
    payload: { organization_id: parsed.organization_id },
  });
  revalidateOrgTree(parsed.organization_id, location.id);
  return { id: location.id, organizationId: parsed.organization_id };
}

export async function updateLocationAction(locationId: string, formData: FormData) {
  await requireEditor();
  const existing = await getProviderLocation(locationId);
  if (!existing || existing.deleted_at) throw new Error('Location not found');

  const parsed = locationSchema.parse({
    name: formData.get('name'),
    status: formData.get('status') || 'active',
    address: formData.get('address') || null,
    phone: formData.get('phone') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null,
    organization_id: formData.get('organization_id') || existing.organization_id,
  });

  // Preserve org claim email — use syncOrganizationContactEmail while unverified.
  await updateLocation(locationId, parsed.organization_id, {
    name: parsed.name,
    status: parsed.status,
    address: parsed.address,
    phone: parsed.phone,
    email: existing.email,
    latitude: parseOptionalNumber(parsed.latitude),
    longitude: parseOptionalNumber(parsed.longitude),
  });
  await rebuildLocationProjection(locationId);
  await writeAuditEvent({
    action: AUDIT_ACTION.updateProviderLocation,
    entityType: AUDIT_ENTITY.providerLocation,
    entityId: locationId,
  });
  revalidateOrgTree(parsed.organization_id, locationId);
}

export async function archiveLocationAction(locationId: string) {
  await requireEditor();
  const existing = await getProviderLocation(locationId);
  if (!existing || existing.deleted_at) throw new Error('Location not found');

  await softDeleteLocation(locationId);
  await rebuildLocationProjection(locationId);
  await writeAuditEvent({
    action: AUDIT_ACTION.archiveProviderLocation,
    entityType: AUDIT_ENTITY.providerLocation,
    entityId: locationId,
  });
  revalidateOrgTree(existing.organization_id, locationId);
  return { organizationId: existing.organization_id };
}

export async function createServiceAction(formData: FormData) {
  await requireEditor();
  const parsed = serviceSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
    service_type: formData.get('service_type') || '',
    location_id: formData.get('location_id'),
    organization_id: formData.get('organization_id'),
  });

  const location = await getProviderLocation(parsed.location_id);
  if (
    !location ||
    location.deleted_at ||
    location.organization_id !== parsed.organization_id
  ) {
    throw new Error('Location not found for organization');
  }

  const service = await createHealthcareService(parsed.organization_id, {
    name: parsed.name,
    active: parsed.active === 'true',
    serviceType: parsed.service_type || null,
    locationId: parsed.location_id,
  });
  await rebuildLocationProjection(parsed.location_id);
  await writeAuditEvent({
    action: AUDIT_ACTION.createProviderHealthcareService,
    entityType: AUDIT_ENTITY.providerHealthcareService,
    entityId: service.id,
    payload: {
      organization_id: parsed.organization_id,
      location_id: parsed.location_id,
    },
  });
  revalidateOrgTree(parsed.organization_id, parsed.location_id);
  return {
    id: service.id,
    organizationId: parsed.organization_id,
    locationId: parsed.location_id,
  };
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  await requireEditor();
  const existing = await getProviderHealthcareService(serviceId);
  if (!existing || existing.deleted_at) throw new Error('Service not found');

  const parsed = serviceSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
    service_type: formData.get('service_type') || '',
    location_id: formData.get('location_id') || existing.location_id,
    organization_id: formData.get('organization_id') || existing.organization_id,
  });

  if (!parsed.location_id) throw new Error('Location is required');

  const location = await getProviderLocation(parsed.location_id);
  if (
    !location ||
    location.deleted_at ||
    location.organization_id !== parsed.organization_id
  ) {
    throw new Error('Location not found for organization');
  }

  await updateHealthcareService(serviceId, parsed.organization_id, {
    name: parsed.name,
    active: parsed.active === 'true',
    serviceType: parsed.service_type || null,
    locationId: parsed.location_id,
  });
  await rebuildLocationProjection(parsed.location_id);
  if (existing.location_id && existing.location_id !== parsed.location_id) {
    await rebuildLocationProjection(existing.location_id);
  }
  await writeAuditEvent({
    action: AUDIT_ACTION.updateProviderHealthcareService,
    entityType: AUDIT_ENTITY.providerHealthcareService,
    entityId: serviceId,
  });
  revalidateOrgTree(parsed.organization_id, parsed.location_id);
}

export async function archiveServiceAction(serviceId: string) {
  await requireEditor();
  const existing = await softDeleteHealthcareService(serviceId);
  if (!existing) throw new Error('Service not found');
  if (existing.location_id) {
    await rebuildLocationProjection(existing.location_id);
  }
  await writeAuditEvent({
    action: AUDIT_ACTION.archiveProviderHealthcareService,
    entityType: AUDIT_ENTITY.providerHealthcareService,
    entityId: serviceId,
  });
  revalidateOrgTree(existing.organization_id, existing.location_id ?? undefined);
  return {
    organizationId: existing.organization_id,
    locationId: existing.location_id,
  };
}
