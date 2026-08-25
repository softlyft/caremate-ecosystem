import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type { PayerOrganization } from '@/types/database';

export type { PaginatedResult };

type ListPaging = {
  page?: number;
  pageSize?: number;
};

function nowIso() {
  return new Date().toISOString();
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export type PayerOrganizationWriteInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  active: boolean;
};

export async function listPayerOrganizations(filters?: {
  search?: string;
} & ListPaging): Promise<PaginatedResult<PayerOrganization>> {
  const supabase = await createClient();
  const page = parsePage(filters?.page);
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('payer_organizations')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return paginatedResult((data ?? []) as PayerOrganization[], count, page, pageSize);
}

export async function getPayerOrganization(id: string): Promise<PayerOrganization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payer_organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as PayerOrganization | null;
}

export async function createPayerOrganization(
  input: PayerOrganizationWriteInput,
): Promise<PayerOrganization> {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const ts = nowIso();
  const name = input.name.trim();
  const email = emptyToNull(input.email);
  const phone = emptyToNull(input.phone);
  const website = emptyToNull(input.website);
  const address = emptyToNull(input.address);

  const { data, error } = await supabase
    .from('payer_organizations')
    .insert({
      id,
      name,
      email,
      phone,
      website,
      address,
      active: input.active,
      resource: {
        resourceType: 'Organization',
        id,
        name,
        active: input.active,
        telecom: [
          email ? { system: 'email', value: email } : null,
          phone ? { system: 'phone', value: phone } : null,
          website ? { system: 'url', value: website } : null,
        ].filter(Boolean),
        address: address ? [{ text: address }] : [],
      },
      deleted_at: null,
      updated_at: ts,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PayerOrganization;
}

export async function updatePayerOrganization(
  organizationId: string,
  input: PayerOrganizationWriteInput,
): Promise<PayerOrganization> {
  const supabase = await createClient();
  const ts = nowIso();
  const name = input.name.trim();
  const email = emptyToNull(input.email);
  const phone = emptyToNull(input.phone);
  const website = emptyToNull(input.website);
  const address = emptyToNull(input.address);

  const { data, error } = await supabase
    .from('payer_organizations')
    .update({
      name,
      email,
      phone,
      website,
      address,
      active: input.active,
      resource: {
        resourceType: 'Organization',
        id: organizationId,
        name,
        active: input.active,
        telecom: [
          email ? { system: 'email', value: email } : null,
          phone ? { system: 'phone', value: phone } : null,
          website ? { system: 'url', value: website } : null,
        ].filter(Boolean),
        address: address ? [{ text: address }] : [],
      },
      updated_at: ts,
    })
    .eq('id', organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return data as PayerOrganization;
}

export async function softDeletePayerOrganization(organizationId: string): Promise<void> {
  const supabase = await createClient();
  const ts = nowIso();
  const { error } = await supabase
    .from('payer_organizations')
    .update({ deleted_at: ts, active: false, updated_at: ts })
    .eq('id', organizationId)
    .is('deleted_at', null);
  if (error) throw error;
}
