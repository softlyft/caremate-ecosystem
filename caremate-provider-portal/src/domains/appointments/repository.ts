import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import type { AppointmentRequest, AppointmentStatus, Profile } from '@/types/database';

export type AppointmentWithProfile = AppointmentRequest & {
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone'> | null;
};

export async function listAppointments(
  organizationId: string,
  status?: AppointmentStatus,
): Promise<AppointmentWithProfile[]> {
  const supabase = await createClient();
  let query = supabase
    .from('appointment_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as AppointmentRequest[];
  if (!rows.length) return [];

  const patientIds = [...new Set(rows.map((r) => r.patient_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, patient_id, phone')
    .in('user_id', patientIds);

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return rows.map((r) => ({
    ...r,
    profile: byUser.get(r.patient_id)
      ? {
          full_name: byUser.get(r.patient_id)!.full_name,
          patient_id: byUser.get(r.patient_id)!.patient_id,
          phone: byUser.get(r.patient_id)!.phone,
        }
      : null,
  }));
}

export async function countAppointments(
  organizationId: string,
  status?: AppointmentStatus,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from('appointment_requests')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function updateAppointmentStatus(input: {
  organizationId: string;
  appointmentId: string;
  status: AppointmentStatus;
  providerNote?: string | null;
  rescheduledDate?: string | null;
  rescheduledTime?: string | null;
}): Promise<AppointmentRequest> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('appointment_requests')
    .update({
      status: input.status,
      provider_note: input.providerNote ?? null,
      rescheduled_date: input.rescheduledDate ?? null,
      rescheduled_time: input.rescheduledTime ?? null,
    })
    .eq('id', input.appointmentId)
    .eq('organization_id', input.organizationId)
    .select('*')
    .single();

  if (error) throw error;

  await insertActivity({
    organizationId: input.organizationId,
    patientId: data.patient_id,
    eventType: `appointment_${input.status}`,
    summary: `Appointment ${input.status}`,
    metadata: { appointment_id: data.id },
  });

  return data as AppointmentRequest;
}
