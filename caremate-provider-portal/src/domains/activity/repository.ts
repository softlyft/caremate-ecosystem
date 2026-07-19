import { createClient } from '@/lib/supabase/server';
import type { Json, PatientProviderActivity } from '@/types/database';

export async function listRecentActivities(
  organizationId: string,
  limit = 20,
): Promise<PatientProviderActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patient_provider_activities')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PatientProviderActivity[];
}

export async function listPatientActivities(
  organizationId: string,
  patientId: string,
  limit = 50,
): Promise<PatientProviderActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patient_provider_activities')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PatientProviderActivity[];
}

export async function insertActivity(input: {
  organizationId: string;
  patientId: string;
  connectionId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Json;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('patient_provider_activities').insert({
    organization_id: input.organizationId,
    patient_id: input.patientId,
    connection_id: input.connectionId ?? null,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
