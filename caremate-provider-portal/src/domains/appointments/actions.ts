'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import {
  createScheduledAppointment,
  deleteAvailability,
  updateAppointmentStatus,
  upsertAvailability,
} from '@/domains/appointments/repository';
import type { AppointmentStatus } from '@/types/database';

const statusSchema = z.enum([
  'pending',
  'confirmed',
  'rejected',
  'completed',
  'rescheduled',
  'checked_in',
  'cancelled',
]);

export async function updateAppointmentStatusAction(formData: FormData) {
  const session = await requireWriteAccess();

  const appointmentId = String(formData.get('appointment_id') || '');
  const status = statusSchema.parse(formData.get('status')) as AppointmentStatus;
  const providerNote = (formData.get('provider_note') as string) || null;
  const rescheduledDate = (formData.get('rescheduled_date') as string) || null;
  const rescheduledTime = (formData.get('rescheduled_time') as string) || null;

  if (!appointmentId) throw new Error('Missing appointment id');

  if (status === 'rescheduled' && !rescheduledDate) {
    throw new Error('Rescheduled date is required.');
  }

  await updateAppointmentStatus({
    organizationId: session.activeOrganizationId,
    appointmentId,
    status,
    providerNote,
    rescheduledDate,
    rescheduledTime,
  });

  revalidatePath('/app/appointments');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/analytics');
}

export async function scheduleAppointmentAction(formData: FormData) {
  const session = await requireWriteAccess();
  const patientId = String(formData.get('patient_id') || '');
  const requestedDate = String(formData.get('requested_date') || '');
  const requestedTime = (formData.get('requested_time') as string) || null;
  const notes = (formData.get('notes') as string) || null;

  if (!patientId || !requestedDate) {
    throw new Error('Patient and date are required');
  }

  await createScheduledAppointment({
    organizationId: session.activeOrganizationId,
    patientId,
    requestedDate,
    requestedTime,
    notes,
    createdBy: session.user.id,
  });

  revalidatePath('/app/appointments');
  revalidatePath('/app/dashboard');
}

export async function addAvailabilityAction(formData: FormData) {
  const session = await requireWriteAccess();
  const weekday = Number(formData.get('weekday'));
  const startTime = String(formData.get('start_time') || '');
  const endTime = String(formData.get('end_time') || '');
  const slotMinutes = Number(formData.get('slot_minutes') || 30);

  if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
    throw new Error('Invalid weekday');
  }
  if (!startTime || !endTime) throw new Error('Start and end time required');

  await upsertAvailability({
    organizationId: session.activeOrganizationId,
    weekday,
    startTime,
    endTime,
    slotMinutes,
  });

  revalidatePath('/app/appointments');
}

export async function deleteAvailabilityAction(formData: FormData) {
  const session = await requireWriteAccess();
  const id = String(formData.get('availability_id') || '');
  if (!id) throw new Error('Missing availability id');
  await deleteAvailability(session.activeOrganizationId, id);
  revalidatePath('/app/appointments');
}
