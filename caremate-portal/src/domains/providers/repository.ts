import { createClient } from '@/lib/supabase/server';
import type {
  Provider,
  ProviderHealthcareService,
  ProviderLocation,
  ProviderOrganization,
} from '@/types/database';

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
  return data as Provider | null;
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
