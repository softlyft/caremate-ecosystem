import { createClient } from '@/lib/supabase/server';
import { toRpcError } from '@/lib/rpc-error';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type {
  PayerOrganization,
  ProviderOrganization,
  ProviderPayerConnection,
  ProviderPayerInitiatedBy,
} from '@/types/database';

export type PayerConnectionWithPayer = ProviderPayerConnection & {
  payer: Pick<PayerOrganization, 'id' | 'name' | 'email' | 'phone'> | null;
};

export type PayerConnectionWithProvider = ProviderPayerConnection & {
  provider: Pick<ProviderOrganization, 'id' | 'name'> | null;
  providerClaimEmail: string | null;
};

async function listBySide(
  filter: {
    column: 'provider_organization_id' | 'payer_organization_id';
    organizationId: string;
  },
  status: ProviderPayerConnection['status'],
  options?: {
    page?: number;
    pageSize?: number;
    initiatedBy?: ProviderPayerInitiatedBy;
  },
): Promise<PaginatedResult<ProviderPayerConnection>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('provider_payer_connections')
    .select('*', { count: 'exact' })
    .eq(filter.column, filter.organizationId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.initiatedBy) {
    query = query.eq('initiated_by', options.initiatedBy);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as ProviderPayerConnection[];
  if (!rows.length) return emptyPage(page, pageSize);
  return paginatedResult(rows, count, page, pageSize);
}

export async function listProviderPayerConnectionsByStatus(
  providerOrganizationId: string,
  status: ProviderPayerConnection['status'],
  options?: {
    page?: number;
    pageSize?: number;
    initiatedBy?: ProviderPayerInitiatedBy;
  },
): Promise<PaginatedResult<PayerConnectionWithPayer>> {
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const base = await listBySide(
    { column: 'provider_organization_id', organizationId: providerOrganizationId },
    status,
    options,
  );
  if (!base.rows.length) return emptyPage(page, pageSize);

  const supabase = await createClient();
  const payerIds = [...new Set(base.rows.map((r) => r.payer_organization_id))];
  const { data: payers } = await supabase
    .from('payer_organizations')
    .select('id, name, email, phone')
    .in('id', payerIds);

  const byId = new Map((payers ?? []).map((p) => [p.id, p]));
  const enriched = base.rows.map((r) => ({
    ...r,
    payer: byId.get(r.payer_organization_id)
      ? {
          id: byId.get(r.payer_organization_id)!.id,
          name: byId.get(r.payer_organization_id)!.name,
          email: byId.get(r.payer_organization_id)!.email,
          phone: byId.get(r.payer_organization_id)!.phone,
        }
      : null,
  }));

  return paginatedResult(enriched, base.total, page, pageSize);
}

export async function listPayerProviderConnectionsByStatus(
  payerOrganizationId: string,
  status: ProviderPayerConnection['status'],
  options?: {
    page?: number;
    pageSize?: number;
    initiatedBy?: ProviderPayerInitiatedBy;
  },
): Promise<PaginatedResult<PayerConnectionWithProvider>> {
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const base = await listBySide(
    { column: 'payer_organization_id', organizationId: payerOrganizationId },
    status,
    options,
  );
  if (!base.rows.length) return emptyPage(page, pageSize);

  const supabase = await createClient();
  const providerIds = [...new Set(base.rows.map((r) => r.provider_organization_id))];
  const [{ data: providers }, { data: profiles }] = await Promise.all([
    supabase.from('provider_organizations').select('id, name').in('id', providerIds),
    supabase
      .from('provider_profiles')
      .select('organization_id, email')
      .in('organization_id', providerIds),
  ]);

  const providerById = new Map((providers ?? []).map((p) => [p.id, p]));
  const emailByOrg = new Map((profiles ?? []).map((p) => [p.organization_id, p.email]));

  const enriched = base.rows.map((r) => {
    const provider = providerById.get(r.provider_organization_id);
    return {
      ...r,
      provider: provider ? { id: provider.id, name: provider.name } : null,
      providerClaimEmail: emailByOrg.get(r.provider_organization_id) ?? null,
    };
  });

  return paginatedResult(enriched, base.total, page, pageSize);
}

export async function approveProviderPayerConnectionAsProvider(
  providerOrganizationId: string,
  connectionId: string,
  providerNote?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('provider_payer_connections')
    .update({
      status: 'approved',
      approved_at: now,
      rejected_at: null,
      provider_note: providerNote ?? null,
    })
    .eq('id', connectionId)
    .eq('provider_organization_id', providerOrganizationId)
    .eq('initiated_by', 'payer')
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) throw error;
}

export async function approveProviderPayerConnectionAsPayer(
  payerOrganizationId: string,
  connectionId: string,
  payerNote?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('provider_payer_connections')
    .update({
      status: 'approved',
      approved_at: now,
      rejected_at: null,
      payer_note: payerNote ?? null,
    })
    .eq('id', connectionId)
    .eq('payer_organization_id', payerOrganizationId)
    .eq('initiated_by', 'provider')
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) throw error;
}

export async function rejectProviderPayerConnectionAsProvider(
  providerOrganizationId: string,
  connectionId: string,
  rejectionReason: string,
): Promise<void> {
  const reason = rejectionReason.trim();
  if (!reason) {
    throw new Error('A rejection reason is required');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('provider_payer_connections')
    .update({
      status: 'rejected',
      rejected_at: now,
      rejection_reason: reason,
    })
    .eq('id', connectionId)
    .eq('provider_organization_id', providerOrganizationId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) throw error;
}

export async function rejectProviderPayerConnectionAsPayer(
  payerOrganizationId: string,
  connectionId: string,
  rejectionReason: string,
): Promise<void> {
  const reason = rejectionReason.trim();
  if (!reason) {
    throw new Error('A rejection reason is required');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('provider_payer_connections')
    .update({
      status: 'rejected',
      rejected_at: now,
      rejection_reason: reason,
    })
    .eq('id', connectionId)
    .eq('payer_organization_id', payerOrganizationId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error) throw error;
}

export async function requestProviderPayerConnectionByEmail(
  providerOrganizationId: string,
  payerClaimEmail: string,
  providerNote?: string | null,
): Promise<ProviderPayerConnection> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_provider_payer_connection_by_email', {
    p_provider_organization_id: providerOrganizationId,
    p_payer_claim_email: payerClaimEmail,
    p_provider_note: providerNote ?? undefined,
  });

  if (error) throw toRpcError(error, 'Failed to request connection');
  return data as ProviderPayerConnection;
}

export async function cancelPendingProviderPayerConnection(
  _organizationId: string,
  connectionId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('A cancellation reason is required');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_pending_provider_payer_connection', {
    p_connection_id: connectionId,
    p_reason: trimmed,
  });
  if (error) throw toRpcError(error, 'Failed to cancel connection');
}

export async function disconnectProviderPayerConnection(
  _organizationId: string,
  connectionId: string,
  reason?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('disconnect_provider_payer_connection', {
    p_connection_id: connectionId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) throw toRpcError(error, 'Failed to disconnect');
}

export async function requestPayerProviderConnectionByEmail(
  payerOrganizationId: string,
  providerClaimEmail: string,
  payerNote?: string | null,
): Promise<ProviderPayerConnection> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_payer_provider_connection_by_email', {
    p_payer_organization_id: payerOrganizationId,
    p_provider_claim_email: providerClaimEmail,
    p_payer_note: payerNote ?? undefined,
  });

  if (error) throw toRpcError(error, 'Failed to request connection');
  return data as ProviderPayerConnection;
}
