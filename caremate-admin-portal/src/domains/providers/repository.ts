import { createClient } from '@/lib/supabase/server';
import type {
  Provider,
  ProviderHealthcareService,
  ProviderLocation,
  ProviderOrganization,
} from '@/types/database';
import {
  buildProviderFhirBundle,
  type ProviderFhirBundle,
} from '@/domains/providers/fhir-bundle';

export async function listProviders(filters?: {
  search?: string;
  type?: string;
}): Promise<Provider[]> {
  const supabase = await createClient();
  let query = supabase
    .from('providers')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Provider[];
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

export async function listProviderOrganizations(filters?: {
  search?: string;
}): Promise<ProviderOrganization[]> {
  const supabase = await createClient();
  let query = supabase
    .from('provider_organizations')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProviderOrganization[];
}

export async function listProviderLocations(filters?: {
  search?: string;
}): Promise<ProviderLocation[]> {
  const supabase = await createClient();
  let query = supabase
    .from('provider_locations')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProviderLocation[];
}

export async function listProviderHealthcareServices(filters?: {
  search?: string;
}): Promise<ProviderHealthcareService[]> {
  const supabase = await createClient();
  let query = supabase
    .from('provider_healthcare_services')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProviderHealthcareService[];
}
