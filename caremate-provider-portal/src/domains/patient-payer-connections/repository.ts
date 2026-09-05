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
  PatientPayerConnection,
  PatientPayerInitiatedBy,
  Profile,
} from '@/types/database';

export type PatientPayerConnectionWithProfile = PatientPayerConnection & {
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone' | 'avatar_url'> | null;
};

export async function listPatientPayerConnectionsByStatus(
  payerOrganizationId: string,
  status: PatientPayerConnection['status'],
  options?: {
    page?: number;
    pageSize?: number;
    initiatedBy?: PatientPayerInitiatedBy;
    search?: string;
  },
): Promise<PaginatedResult<PatientPayerConnectionWithProfile>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);
  const q = options?.search?.trim();

  let matchingPatientIds: string[] | null = null;
  if (q) {
    const escaped = q.replace(/[%_\\]/g, '\\$&');
    const { data: matchingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .or(
        `full_name.ilike.%${escaped}%,patient_id.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
      );
    if (profileError) throw profileError;
    matchingPatientIds = (matchingProfiles ?? []).map((p) => p.user_id);
    if (!matchingPatientIds.length) return emptyPage(page, pageSize);
  }

  let query = supabase
    .from('patient_payer_connections')
    .select('*', { count: 'exact' })
    .eq('payer_organization_id', payerOrganizationId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.initiatedBy) {
    query = query.eq('initiated_by', options.initiatedBy);
  }

  if (matchingPatientIds) {
    query = query.in('patient_id', matchingPatientIds);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as PatientPayerConnection[];
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

export async function approvePatientPayerConnectionAsPayer(
  _payerOrganizationId: string,
  connectionId: string,
  payerNote?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_patient_payer_connection', {
    p_connection_id: connectionId,
    p_accept: true,
    p_note: payerNote ?? undefined,
  });
  if (error) throw error;
}

export async function rejectPatientPayerConnectionAsPayer(
  _payerOrganizationId: string,
  connectionId: string,
  rejectionReason: string,
): Promise<void> {
  const reason = rejectionReason.trim();
  if (!reason) {
    throw new Error('A rejection reason is required');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_patient_payer_connection', {
    p_connection_id: connectionId,
    p_accept: false,
    p_rejection_reason: reason,
  });
  if (error) throw error;
}

export async function cancelPendingPatientPayerConnection(
  _payerOrganizationId: string,
  connectionId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('A cancellation reason is required');
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_pending_patient_payer_connection', {
    p_connection_id: connectionId,
    p_reason: trimmed,
  });
  if (error) throw error;
}

export async function disconnectPatientPayerConnection(
  _payerOrganizationId: string,
  connectionId: string,
  reason?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('disconnect_patient_payer_connection', {
    p_connection_id: connectionId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) throw error;
}

export async function requestPatientPayerConnectionByCaremateId(
  payerOrganizationId: string,
  caremateId: string,
  payerNote?: string | null,
): Promise<PatientPayerConnection> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_payer_patient_connection_by_caremate_id', {
    p_payer_organization_id: payerOrganizationId,
    p_caremate_id: caremateId,
    p_payer_note: payerNote ?? undefined,
  });

  if (error) throw toRpcError(error, 'Failed to request connection');
  return data as PatientPayerConnection;
}
