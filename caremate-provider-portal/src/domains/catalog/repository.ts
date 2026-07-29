import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import {
  buildHealthcareServiceResource,
  buildLocationResource,
} from '@/domains/catalog/fhir-resource';
import type { ProviderHealthcareService, ProviderLocation } from '@/types/database';

const SOURCE = 'provider_portal';

function nowIso() {
  return new Date().toISOString();
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
  options?: { page?: number; pageSize?: number },
): Promise<PaginatedResult<ProviderLocation>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
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

export type CatalogServiceSummary = {
  id: string;
  name: string;
  service_type: string | null;
  location_id: string | null;
};

export type CatalogSummary = {
  primaryLocation: ProviderLocation | null;
  services: CatalogServiceSummary[];
  /** Claim / contact email shared across profile + locations. */
  contactEmail: string | null;
};

/** Primary location + org-wide healthcare services for derive-read UI. */
export async function getCatalogSummaryForOrganization(
  organizationId: string,
): Promise<CatalogSummary> {
  const supabase = await createClient();
  const locations = await listLocationsForOrganization(organizationId);
  const primaryLocation =
    locations.find((loc) => loc.status === 'active') ?? locations[0] ?? null;

  const [{ data: servicesData, error: servicesError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from('provider_healthcare_services')
        .select('id, name, service_type, location_id')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('provider_profiles')
        .select('email')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);
  if (servicesError) throw servicesError;
  if (profileError) throw profileError;

  const contactEmail =
    (typeof profile?.email === 'string' && profile.email.trim()) ||
    primaryLocation?.email?.trim() ||
    locations.find((loc) => loc.email?.trim())?.email?.trim() ||
    null;

  return {
    primaryLocation,
    services: (servicesData ?? []) as CatalogServiceSummary[],
    contactEmail,
  };
}

/** Resolved claim contact email for the org (profile first, else any location). */
export async function getOrgContactEmail(organizationId: string): Promise<string | null> {
  const summary = await getCatalogSummaryForOrganization(organizationId);
  return summary.contactEmail;
}

export async function getLocationForOrganization(
  organizationId: string,
  locationId: string,
): Promise<ProviderLocation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_locations')
    .select('*')
    .eq('id', locationId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderLocation | null;
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
  organizationId: string,
  locationId: string,
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

export async function softDeleteLocation(
  organizationId: string,
  locationId: string,
): Promise<void> {
  const supabase = await createClient();
  const ts = nowIso();
  const { error } = await supabase
    .from('provider_locations')
    .update({ deleted_at: ts, status: 'inactive', updated_at: ts })
    .eq('id', locationId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function listServicesForLocation(
  organizationId: string,
  locationId: string,
): Promise<ProviderHealthcareService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProviderHealthcareService[];
}

export async function listServicesForLocationPage(
  organizationId: string,
  locationId: string,
  options?: { page?: number; pageSize?: number },
): Promise<PaginatedResult<ProviderHealthcareService>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from('provider_healthcare_services')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return paginatedResult((data ?? []) as ProviderHealthcareService[], count, page, pageSize);
}

export async function getServiceForOrganization(
  organizationId: string,
  serviceId: string,
): Promise<ProviderHealthcareService | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_healthcare_services')
    .select('*')
    .eq('id', serviceId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as ProviderHealthcareService | null;
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
  organizationId: string,
  serviceId: string,
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
  organizationId: string,
  serviceId: string,
): Promise<ProviderHealthcareService | null> {
  const supabase = await createClient();
  const existing = await getServiceForOrganization(organizationId, serviceId);
  if (!existing) return null;
  const ts = nowIso();
  const { error } = await supabase
    .from('provider_healthcare_services')
    .update({ deleted_at: ts, active: false, updated_at: ts })
    .eq('id', serviceId)
    .eq('organization_id', organizationId)
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
