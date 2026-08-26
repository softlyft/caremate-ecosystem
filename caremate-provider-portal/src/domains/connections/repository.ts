import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type { PatientProviderConnection, Profile } from '@/types/database';

export type ConnectionWithProfile = PatientProviderConnection & {
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone' | 'avatar_url'> | null;
};

type NotifyKind = 'request' | 'accepted' | 'declined' | 'cancelled' | 'disconnected';

async function notifyProviderConnection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connectionId: string,
  kind: NotifyKind,
) {
  try {
    void supabase.functions
      .invoke('notify-provider-connection', { body: { connectionId, kind } })
      .catch(() => {
        // Push is best-effort.
      });
  } catch {
    // Push is best-effort.
  }
}

export async function listConnectionsByStatus(
  organizationId: string,
  status: PatientProviderConnection['status'],
  options?: {
    page?: number;
    pageSize?: number;
    initiatedBy?: PatientProviderConnection['initiated_by'];
  },
): Promise<PaginatedResult<ConnectionWithProfile>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('patient_provider_connections')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.initiatedBy) {
    query = query.eq('initiated_by', options.initiatedBy);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as PatientProviderConnection[];
  if (!rows.length) return emptyPage(page, pageSize);

  const patientIds = rows.map((r) => r.patient_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, patient_id, phone, avatar_url')
    .in('user_id', patientIds);

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const enriched = rows.map((r) => ({
    ...r,
    profile: byUser.get(r.patient_id)
      ? {
          full_name: byUser.get(r.patient_id)!.full_name,
          patient_id: byUser.get(r.patient_id)!.patient_id,
          phone: byUser.get(r.patient_id)!.phone,
          avatar_url: byUser.get(r.patient_id)!.avatar_url,
        }
      : null,
  }));

  return paginatedResult(enriched, count, page, pageSize);
}

export async function countConnections(
  organizationId: string,
  status?: PatientProviderConnection['status'],
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from('patient_provider_connections')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function approveConnection(
  _organizationId: string,
  connectionId: string,
  providerNote?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_patient_provider_connection', {
    p_connection_id: connectionId,
    p_accept: true,
    p_note: providerNote ?? undefined,
  });
  if (error) throw error;
  await notifyProviderConnection(supabase, connectionId, 'accepted');
}

export async function rejectConnection(
  _organizationId: string,
  connectionId: string,
  rejectionReason: string,
): Promise<void> {
  const reason = rejectionReason.trim();
  if (!reason) {
    throw new Error('A rejection reason is required');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_patient_provider_connection', {
    p_connection_id: connectionId,
    p_accept: false,
    p_rejection_reason: reason,
  });
  if (error) throw error;
  await notifyProviderConnection(supabase, connectionId, 'declined');
}

export async function cancelPendingConnection(
  _organizationId: string,
  connectionId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('A cancellation reason is required');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_pending_patient_provider_connection', {
    p_connection_id: connectionId,
    p_reason: trimmed,
  });
  if (error) throw error;
  await notifyProviderConnection(supabase, connectionId, 'cancelled');
}

export async function disconnectConnection(
  _organizationId: string,
  connectionId: string,
  reason?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('disconnect_patient_provider_connection', {
    p_connection_id: connectionId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) throw error;
  await notifyProviderConnection(supabase, connectionId, 'disconnected');
}

export async function requestConnectionByCaremateId(
  organizationId: string,
  caremateId: string,
  providerNote?: string | null,
): Promise<PatientProviderConnection> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_provider_connection_by_caremate_id', {
    p_organization_id: organizationId,
    p_caremate_id: caremateId,
    p_provider_note: providerNote ?? undefined,
  });

  if (error) throw error;
  const connection = data as PatientProviderConnection;
  await notifyProviderConnection(supabase, connection.id, 'request');
  return connection;
}
