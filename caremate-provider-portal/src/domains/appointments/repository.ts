import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type {
  AppointmentAvailability,
  AppointmentRequest,
  AppointmentSource,
  AppointmentStatus,
  Profile,
} from '@/types/database';

export type AppointmentWithProfile = AppointmentRequest & {
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone'> | null;
};

export async function listAppointments(
  organizationId: string,
  options?: {
    status?: AppointmentStatus;
    source?: AppointmentSource;
    page?: number;
    pageSize?: number;
  },
): Promise<PaginatedResult<AppointmentWithProfile>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('appointment_requests')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('requested_date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.status) query = query.eq('status', options.status);
  if (options?.source) query = query.eq('source', options.source);

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as AppointmentRequest[];
  if (!rows.length) return emptyPage(page, pageSize);

  const patientIds = [...new Set(rows.map((r) => r.patient_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, patient_id, phone')
    .in('user_id', patientIds);

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const enriched = rows.map((r) => ({
    ...r,
    profile: byUser.get(r.patient_id)
      ? {
          full_name: byUser.get(r.patient_id)!.full_name,
          patient_id: byUser.get(r.patient_id)!.patient_id,
          phone: byUser.get(r.patient_id)!.phone,
        }
      : null,
  }));

  return paginatedResult(enriched, count, page, pageSize);
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

  const patch: Partial<AppointmentRequest> = {
    status: input.status,
    provider_note: input.providerNote ?? null,
    rescheduled_date: input.rescheduledDate ?? null,
    rescheduled_time: input.rescheduledTime ?? null,
  };
  if (input.status === 'checked_in') {
    patch.checked_in_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('appointment_requests')
    .update(patch)
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

export async function createScheduledAppointment(input: {
  organizationId: string;
  patientId: string;
  requestedDate: string;
  requestedTime?: string | null;
  notes?: string | null;
  createdBy: string;
}): Promise<AppointmentRequest> {
  const supabase = await createClient();

  const { data: connection, error: connError } = await supabase
    .from('patient_provider_connections')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('patient_id', input.patientId)
    .eq('status', 'approved')
    .maybeSingle();

  if (connError) throw connError;
  if (!connection) throw new Error('Patient must be connected before scheduling');

  const { data, error } = await supabase
    .from('appointment_requests')
    .insert({
      organization_id: input.organizationId,
      patient_id: input.patientId,
      requested_date: input.requestedDate,
      requested_time: input.requestedTime ?? null,
      notes: input.notes ?? null,
      status: 'confirmed',
      source: 'provider_scheduled',
      created_by: input.createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;

  await insertActivity({
    organizationId: input.organizationId,
    patientId: input.patientId,
    connectionId: connection.id,
    eventType: 'appointment_scheduled',
    summary: 'Provider scheduled an appointment',
    metadata: { appointment_id: data.id },
  });

  return data as AppointmentRequest;
}

export async function listAvailability(
  organizationId: string,
): Promise<AppointmentAvailability[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_appointment_availability')
    .select('*')
    .eq('organization_id', organizationId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AppointmentAvailability[];
}

export async function upsertAvailability(input: {
  organizationId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}): Promise<AppointmentAvailability> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_appointment_availability')
    .insert({
      organization_id: input.organizationId,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      slot_minutes: input.slotMinutes,
      active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AppointmentAvailability;
}

export async function deleteAvailability(
  organizationId: string,
  availabilityId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('provider_appointment_availability')
    .delete()
    .eq('id', availabilityId)
    .eq('organization_id', organizationId);
  if (error) throw error;
}
