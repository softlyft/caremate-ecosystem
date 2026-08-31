import { config } from '@/constants/env';
import { supabase } from '@/lib/supabase';

export const PAYER_DIRECTORY_PAGE_SIZE = 15;

export type PayerOrganizationSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  active: boolean;
};

export type PayerListPage = {
  rows: PayerOrganizationSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function mapDirectoryRow(row: {
  id: string | null;
  name: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  active: boolean | null;
}): PayerOrganizationSummary | null {
  if (!row.id || !row.name) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: null,
    phone: row.phone,
    website: row.website,
    address: row.address,
    active: row.active ?? true,
  };
}

class PayerRepository {
  async listPage(input?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PayerListPage> {
    if (!config.isSupabaseConfigured) {
      return { rows: [], page: 1, pageSize: PAYER_DIRECTORY_PAGE_SIZE, hasMore: false };
    }

    const page = Math.max(1, input?.page ?? 1);
    const pageSize = input?.pageSize ?? PAYER_DIRECTORY_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize; // fetch one extra to detect hasMore
    const search = input?.search?.trim();

    let query = supabase
      .from('payer_directory')
      .select('id, name, phone, website, address, active')
      .eq('active', true)
      .order('name', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? [])
      .map(mapDirectoryRow)
      .filter((row): row is PayerOrganizationSummary => row != null);
    const hasMore = rows.length > pageSize;
    return {
      rows: hasMore ? rows.slice(0, pageSize) : rows,
      page,
      pageSize,
      hasMore,
    };
  }

  async findById(id: string): Promise<PayerOrganizationSummary | null> {
    if (!config.isSupabaseConfigured || !id) {
      return null;
    }

    const { data, error } = await supabase
      .from('payer_directory')
      .select('id, name, phone, website, address, active')
      .eq('id', id)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDirectoryRow(data) : null;
  }

  /** Approved Care Portal connections — supported insurers for a provider org. */
  async listApprovedForProviderOrganization(
    providerOrganizationId: string,
  ): Promise<PayerOrganizationSummary[]> {
    if (!config.isSupabaseConfigured || !providerOrganizationId) {
      return [];
    }

    const { data: links, error: linksError } = await supabase.rpc(
      'list_approved_payer_org_ids_for_provider',
      { p_provider_organization_id: providerOrganizationId },
    );

    if (linksError) throw linksError;

    const payerIds = [...new Set((links ?? []).map((row) => row.payer_organization_id))];
    if (!payerIds.length) {
      return [];
    }

    const { data: payers, error: payersError } = await supabase
      .from('payer_directory')
      .select('id, name, phone, website, address, active')
      .in('id', payerIds)
      .eq('active', true)
      .order('name', { ascending: true });

    if (payersError) throw payersError;
    return (payers ?? [])
      .map(mapDirectoryRow)
      .filter((row): row is PayerOrganizationSummary => row != null);
  }
}

export const payerRepository = new PayerRepository();
