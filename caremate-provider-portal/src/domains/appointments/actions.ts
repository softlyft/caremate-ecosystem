'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWriteAccess } from '@/lib/auth';
import { updateAppointmentStatus } from '@/domains/appointments/repository';
import type { AppointmentStatus } from '@/types/database';

const statusSchema = z.enum(['pending', 'confirmed', 'rejected', 'completed', 'rescheduled']);

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
