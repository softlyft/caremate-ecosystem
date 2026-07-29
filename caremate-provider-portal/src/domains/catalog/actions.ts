'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireManageAccess } from '@/lib/auth';
import { ORG_TYPES } from '@/constants/org-types';
import {
  createHealthcareService,
  createLocation,
  getLocationForOrganization,
  getOrgContactEmail,
  getServiceForOrganization,
  rebuildLocationProjection,
  softDeleteHealthcareService,
  softDeleteLocation,
  updateHealthcareService,
  updateLocation,
} from '@/domains/catalog/repository';

const locationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  status: z.enum(['active', 'inactive']).default('active'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
});

const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  active: z.enum(['true', 'false']).default('true'),
  service_type: z.enum(ORG_TYPES).optional().or(z.literal('')),
  location_id: z.string().uuid(),
});

function parseOptionalNumber(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function revalidateCatalog(locationId?: string) {
  revalidatePath('/app/organization');
  if (locationId) {
    revalidatePath(`/app/organization/locations/${locationId}`);
  }
}

export async function createLocationAction(formData: FormData) {
  const session = await requireManageAccess();
  const parsed = locationSchema.parse({
    name: formData.get('name'),
    status: formData.get('status') || 'active',
    address: formData.get('address') || null,
    phone: formData.get('phone') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null,
  });

  const contactEmail = await getOrgContactEmail(session.activeOrganizationId);
  const location = await createLocation(session.activeOrganizationId, {
    name: parsed.name,
    status: parsed.status,
    address: parsed.address,
    phone: parsed.phone,
    email: contactEmail,
    latitude: parseOptionalNumber(parsed.latitude),
    longitude: parseOptionalNumber(parsed.longitude),
  });

  await rebuildLocationProjection(location.id);
  revalidateCatalog(location.id);
  return { id: location.id };
}

export async function updateLocationAction(locationId: string, formData: FormData) {
  const session = await requireManageAccess();
  const existing = await getLocationForOrganization(session.activeOrganizationId, locationId);
  if (!existing) throw new Error('Location not found');

  const parsed = locationSchema.parse({
    name: formData.get('name'),
    status: formData.get('status') || 'active',
    address: formData.get('address') || null,
    phone: formData.get('phone') || null,
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null,
  });

  // Claim contact email is not editable by providers — preserve existing.
  await updateLocation(session.activeOrganizationId, locationId, {
    name: parsed.name,
    status: parsed.status,
    address: parsed.address,
    phone: parsed.phone,
    email: existing.email,
    latitude: parseOptionalNumber(parsed.latitude),
    longitude: parseOptionalNumber(parsed.longitude),
  });

  await rebuildLocationProjection(locationId);
  revalidateCatalog(locationId);
}

export async function softDeleteLocationAction(locationId: string) {
  const session = await requireManageAccess();
  const existing = await getLocationForOrganization(session.activeOrganizationId, locationId);
  if (!existing) throw new Error('Location not found');

  await softDeleteLocation(session.activeOrganizationId, locationId);
  await rebuildLocationProjection(locationId);
  revalidateCatalog(locationId);
}

export async function createServiceAction(formData: FormData) {
  const session = await requireManageAccess();
  const parsed = serviceSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
    service_type: formData.get('service_type') || '',
    location_id: formData.get('location_id'),
  });

  const location = await getLocationForOrganization(
    session.activeOrganizationId,
    parsed.location_id,
  );
  if (!location) throw new Error('Location not found');

  const service = await createHealthcareService(session.activeOrganizationId, {
    name: parsed.name,
    active: parsed.active === 'true',
    serviceType: parsed.service_type || null,
    locationId: parsed.location_id,
  });

  await rebuildLocationProjection(parsed.location_id);
  revalidateCatalog(parsed.location_id);
  return { id: service.id, locationId: parsed.location_id };
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const session = await requireManageAccess();
  const existing = await getServiceForOrganization(session.activeOrganizationId, serviceId);
  if (!existing) throw new Error('Service not found');

  const parsed = serviceSchema.parse({
    name: formData.get('name'),
    active: formData.get('active') || 'true',
    service_type: formData.get('service_type') || '',
    location_id: formData.get('location_id') || existing.location_id,
  });

  if (!parsed.location_id) throw new Error('Location is required');

  const location = await getLocationForOrganization(
    session.activeOrganizationId,
    parsed.location_id,
  );
  if (!location) throw new Error('Location not found');

  await updateHealthcareService(session.activeOrganizationId, serviceId, {
    name: parsed.name,
    active: parsed.active === 'true',
    serviceType: parsed.service_type || null,
    locationId: parsed.location_id,
  });

  await rebuildLocationProjection(parsed.location_id);
  if (existing.location_id && existing.location_id !== parsed.location_id) {
    await rebuildLocationProjection(existing.location_id);
  }
  revalidateCatalog(parsed.location_id);
}

export async function softDeleteServiceAction(serviceId: string) {
  const session = await requireManageAccess();
  const existing = await softDeleteHealthcareService(session.activeOrganizationId, serviceId);
  if (!existing) throw new Error('Service not found');
  if (existing.location_id) {
    await rebuildLocationProjection(existing.location_id);
    revalidateCatalog(existing.location_id);
    return { locationId: existing.location_id };
  }
  revalidateCatalog();
  return { locationId: null as string | null };
}
