import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type {
  Provider,
  ProviderHealthcareService,
  ProviderLocation,
  ProviderOrganization,
  ProviderProfile,
} from '@/types/database';
import {
  buildProviderFhirBundle,
  type ProviderFhirBundle,
} from '@/domains/providers/fhir-bundle';
import {
  buildHealthcareServiceResource,
  buildLocationResource,
  buildOrganizationResource,
} from '@/domains/providers/fhir-resource';

export type { PaginatedResult };

type ListPaging = {
  page?: number;
  pageSize?: number;
};

export async function listProviders(filters?: {
  search?: string;
  type?: string;
} & ListPaging): Promise<PaginatedResult<Provider>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('providers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as Provider[], count, page, pageSize);
}

export async function getProvider(id: string): Promise<Provider | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) return data as Provider;

  // Location list links use location UUID; pin id usually matches, but fall back by location_id.
  const byLocation = await supabase
    .from('providers')
    .select('*')
    .eq('location_id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (byLocation.error) throw byLocation.error;
  return byLocation.data as Provider | null;
}

export async function getProviderFhirBundle(provider: Provider): Promise<ProviderFhirBundle> {
  const supabase = await createClient();
  const locationId = provider.location_id ?? provider.id;
  const organizationId = provider.organization_id;
  const serviceIds = Array.isArray(provider.healthcare_service_ids)
    ? provider.healthcare_service_ids.map(String).filter(Boolean)
    : [];

  const [organizationResult, locationResult, servicesResult] = await Promise.all([
    organizationId
      ? supabase
          .from('provider_organizations')
          .select('id, resource')
          .eq('id', organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    locationId
      ? supabase
          .from('provider_locations')
          .select('id, resource')
          .eq('id', locationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    serviceIds.length > 0
      ? supabase
          .from('provider_healthcare_services')
          .select('id, resource')
          .in('id', serviceIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (organizationResult.error) throw organizationResult.error;
  if (locationResult.error) throw locationResult.error;
  if (servicesResult.error) throw servicesResult.error;

  return buildProviderFhirBundle({
    organizationId,
    organizationResource: organizationResult.data?.resource ?? null,
    locationId,
    locationResource: locationResult.data?.resource ?? null,
    healthcareServices: (servicesResult.data ?? []).map((row) => ({
      id: row.id,
      resource: row.resource,
    })),
  });
}

export async function getProviderOrganization(id: string): Promise<ProviderOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderOrganization | null;
}

export async function getOrganizationFhirBundle(
  organization: ProviderOrganization,
): Promise<ProviderFhirBundle> {
  return buildProviderFhirBundle({
    organizationId: organization.id,
    organizationResource: organization.resource,
  });
}

export async function getProviderHealthcareService(
  id: string,
): Promise<ProviderHealthcareService | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderHealthcareService | null;
}

export async function getHealthcareServiceFhirBundle(
  service: ProviderHealthcareService,
): Promise<ProviderFhirBundle> {
  return buildProviderFhirBundle({
    healthcareServices: [{ id: service.id, resource: service.resource }],
  });
}

export async function listLocationsForOrganization(
  organizationId: string,
): Promise<ProviderLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_locations')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProviderLocation[];
}

export async function listLocationsForOrganizationPage(
  organizationId: string,
  opts?: ListPaging,
): Promise<PaginatedResult<ProviderLocation>> {
  const supabase = await createClient();
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from('provider_locations')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderLocation[], count, page, pageSize);
}

export async function getProviderLocation(id: string): Promise<ProviderLocation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_locations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderLocation | null;
}

export async function getLocationFhirBundle(location: ProviderLocation): Promise<ProviderFhirBundle> {
  return buildProviderFhirBundle({
    locationId: location.id,
    locationResource: location.resource,
  });
}

export async function listServicesForLocation(
  locationId: string,
): Promise<ProviderHealthcareService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .select('*')
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProviderHealthcareService[];
}

export async function listServicesForLocationPage(
  locationId: string,
  opts?: ListPaging,
): Promise<PaginatedResult<ProviderHealthcareService>> {
  const supabase = await createClient();
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from('provider_healthcare_services')
    .select('*', { count: 'exact' })
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderHealthcareService[], count, page, pageSize);
}

const SOURCE = 'admin_portal';

function nowIso() {
  return new Date().toISOString();
}

export type OrganizationWriteInput = {
  name: string;
  active: boolean;
  type?: string | null;
};

export async function createOrganization(
  input: OrganizationWriteInput,
): Promise<ProviderOrganization> {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const ts = nowIso();
  const resource = buildOrganizationResource({
    id,
    name: input.name,
    active: input.active,
    type: input.type ?? null,
  });

  const { data, error } = await supabase
    .from('provider_organizations')
    .insert({
      id,
      name: input.name.trim(),
      type: input.type ?? null,
      active: input.active,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      deleted_at: null,
      updated_at: ts,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderOrganization;
}

export async function updateOrganization(
  organizationId: string,
  input: OrganizationWriteInput,
): Promise<ProviderOrganization> {
  const supabase = await createClient();
  const ts = nowIso();
  const resource = buildOrganizationResource({
    id: organizationId,
    name: input.name,
    active: input.active,
    type: input.type ?? null,
  });

  const { data, error } = await supabase
    .from('provider_organizations')
    .update({
      name: input.name.trim(),
      type: input.type ?? null,
      active: input.active,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      updated_at: ts,
    })
    .eq('id', organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderOrganization;
}

export async function softDeleteOrganization(organizationId: string): Promise<void> {
  const supabase = await createClient();
  const ts = nowIso();
  const { error } = await supabase
    .from('provider_organizations')
    .update({ deleted_at: ts, active: false, updated_at: ts })
    .eq('id', organizationId)
    .is('deleted_at', null);
  if (error) throw error;
}

export type LocationWriteInput = {
  name: string;
  status: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function createLocation(
  organizationId: string,
  input: LocationWriteInput,
): Promise<ProviderLocation> {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const ts = nowIso();
  const resource = buildLocationResource({
    id,
    organizationId,
    name: input.name,
    status: input.status,
    address: input.address,
    phone: input.phone,
    email: input.email,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const { data, error } = await supabase
    .from('provider_locations')
    .insert({
      id,
      organization_id: organizationId,
      name: input.name.trim(),
      status: input.status || 'active',
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      deleted_at: null,
      updated_at: ts,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderLocation;
}

export async function updateLocation(
  locationId: string,
  organizationId: string,
  input: LocationWriteInput,
): Promise<ProviderLocation> {
  const supabase = await createClient();
  const ts = nowIso();
  const resource = buildLocationResource({
    id: locationId,
    organizationId,
    name: input.name,
    status: input.status,
    address: input.address,
    phone: input.phone,
    email: input.email,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const { data, error } = await supabase
    .from('provider_locations')
    .update({
      name: input.name.trim(),
      status: input.status || 'active',
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      updated_at: ts,
    })
    .eq('id', locationId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderLocation;
}

export async function softDeleteLocation(locationId: string): Promise<void> {
  const supabase = await createClient();
  const ts = nowIso();
  const { error } = await supabase
    .from('provider_locations')
    .update({ deleted_at: ts, status: 'inactive', updated_at: ts })
    .eq('id', locationId)
    .is('deleted_at', null);
  if (error) throw error;
}

export type ServiceWriteInput = {
  name: string;
  active: boolean;
  serviceType?: string | null;
  locationId: string;
};

export async function createHealthcareService(
  organizationId: string,
  input: ServiceWriteInput,
): Promise<ProviderHealthcareService> {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const ts = nowIso();
  const resource = buildHealthcareServiceResource({
    id,
    organizationId,
    locationId: input.locationId,
    name: input.name,
    active: input.active,
    serviceType: input.serviceType,
  });

  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .insert({
      id,
      organization_id: organizationId,
      location_id: input.locationId,
      name: input.name.trim(),
      active: input.active,
      service_type: input.serviceType?.trim() || null,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      deleted_at: null,
      updated_at: ts,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderHealthcareService;
}

export async function updateHealthcareService(
  serviceId: string,
  organizationId: string,
  input: ServiceWriteInput,
): Promise<ProviderHealthcareService> {
  const supabase = await createClient();
  const ts = nowIso();
  const resource = buildHealthcareServiceResource({
    id: serviceId,
    organizationId,
    locationId: input.locationId,
    name: input.name,
    active: input.active,
    serviceType: input.serviceType,
  });

  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .update({
      location_id: input.locationId,
      name: input.name.trim(),
      active: input.active,
      service_type: input.serviceType?.trim() || null,
      resource,
      source: SOURCE,
      last_ingested_at: ts,
      updated_at: ts,
    })
    .eq('id', serviceId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderHealthcareService;
}

export async function softDeleteHealthcareService(
  serviceId: string,
): Promise<ProviderHealthcareService | null> {
  const existing = await getProviderHealthcareService(serviceId);
  if (!existing || existing.deleted_at) return null;
  const supabase = await createClient();
  const ts = nowIso();
  const { error } = await supabase
    .from('provider_healthcare_services')
    .update({ deleted_at: ts, active: false, updated_at: ts })
    .eq('id', serviceId)
    .is('deleted_at', null);
  if (error) throw error;
  return existing;
}

export async function rebuildLocationProjection(locationId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('rebuild_provider_projection_for_location', {
    p_location_id: locationId,
  });
  if (error) throw error;
}

export async function rebuildProjectionsForOrganization(organizationId: string): Promise<void> {
  const locations = await listLocationsForOrganization(organizationId);
  for (const loc of locations) {
    await rebuildLocationProjection(loc.id);
  }
}

export async function getProviderProfile(
  organizationId: string,
): Promise<ProviderProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderProfile | null;
}

export function isOrgVerified(profile: ProviderProfile | null): boolean {
  return profile?.verification_status === 'verified';
}

/** Org-wide claim contact email (profile first, else any location). */
export async function getOrganizationContactEmail(
  organizationId: string,
): Promise<string | null> {
  const profile = await getProviderProfile(organizationId);
  if (profile?.email?.trim()) return profile.email.trim().toLowerCase();
  const locations = await listLocationsForOrganization(organizationId);
  const fromLoc = locations.find((loc) => loc.email?.trim())?.email?.trim();
  return fromLoc ? fromLoc.toLowerCase() : null;
}

/**
 * Sets the unique claim contact email on provider_profiles and every location.
 * Rejects when the org is already verified.
 */
export async function syncOrganizationContactEmail(
  organizationId: string,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('Email is required');

  const profile = await getProviderProfile(organizationId);
  if (isOrgVerified(profile)) {
    throw new Error('Claim contact email is locked after the organization is verified');
  }

  const supabase = await createClient();
  const ts = nowIso();

  if (profile) {
    const { error } = await supabase
      .from('provider_profiles')
      .update({ email: normalized, updated_at: ts })
      .eq('organization_id', organizationId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('provider_profiles').insert({
      organization_id: organizationId,
      email: normalized,
      verification_status: 'pending',
      organization_type: 'clinic',
      updated_at: ts,
    });
    if (error) throw error;
  }

  const { error: locError } = await supabase
    .from('provider_locations')
    .update({ email: normalized, updated_at: ts, source: SOURCE, last_ingested_at: ts })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);
  if (locError) throw locError;

  await rebuildProjectionsForOrganization(organizationId);
}

export async function listProviderOrganizations(filters?: {
  search?: string;
} & ListPaging): Promise<PaginatedResult<ProviderOrganization>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('provider_organizations')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderOrganization[], count, page, pageSize);
}

export async function listProviderLocations(filters?: {
  search?: string;
} & ListPaging): Promise<PaginatedResult<ProviderLocation>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('provider_locations')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderLocation[], count, page, pageSize);
}

export async function listProviderHealthcareServices(filters?: {
  search?: string;
} & ListPaging): Promise<PaginatedResult<ProviderHealthcareService>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('provider_healthcare_services')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderHealthcareService[], count, page, pageSize);
}
