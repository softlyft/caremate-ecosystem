import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import type { PatientProviderConnection, Profile } from '@/types/database';

export type ConnectionWithProfile = PatientProviderConnection & {
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone' | 'avatar_url'> | null;
};

export async function listConnectionsByStatus(
  organizationId: string,
  status: PatientProviderConnection['status'],
): Promise<ConnectionWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patient_provider_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as PatientProviderConnection[];
  if (!rows.length) return [];

  const patientIds = rows.map((r) => r.patient_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, patient_id, phone, avatar_url')
    .in('user_id', patientIds);

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return rows.map((r) => ({
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
  organizationId: string,
  connectionId: string,
  providerNote?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('patient_provider_connections')
    .update({
      status: 'approved',
      approved_at: now,
      rejected_at: null,
      provider_note: providerNote ?? null,
    })
    .eq('id', connectionId)
    .eq('organization_id', organizationId)
    .eq('initiated_by', 'patient')
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) throw error;

  await insertActivity({
    organizationId,
    patientId: data.patient_id,
    connectionId: data.id,
    eventType: 'connection_approved',
    summary: 'Connection approved',
  });
}

export async function rejectConnection(
  organizationId: string,
  connectionId: string,
  rejectionReason: string,
): Promise<void> {
  const reason = rejectionReason.trim();
  if (!reason) {
    throw new Error('A rejection reason is required');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('patient_provider_connections')
    .update({
      status: 'rejected',
      rejected_at: now,
      rejection_reason: reason,
    })
    .eq('id', connectionId)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) throw error;

  await insertActivity({
    organizationId,
    patientId: data.patient_id,
    connectionId: data.id,
    eventType: 'connection_rejected',
    summary: 'Connection rejected',
    metadata: { rejection_reason: reason },
  });
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
    p_provider_note: providerNote ?? null,
  });

  if (error) throw error;
  return data as PatientProviderConnection;
}
