'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCommunitySession, requireLeaderAccess } from '@/lib/auth';
import { POINT_VALUES } from '@/constants/points';
import { recordContribution } from '@/domains/contributions/repository';
import { createNotification } from '@/domains/notifications/repository';
import {
  cancelRegistration,
  createEvent,
  exportAttendanceCsv,
  getEvent,
  listEvents,
  markAttendance,
  register,
  updateEvent,
} from '@/domains/events/repository';

const eventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  starts_at: z.string().min(1),
  ends_at: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  registration_deadline: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  registration_open: z.coerce.boolean().optional(),
});

export async function listEventsAction() {
  const session = await requireCommunitySession();
  return listEvents(session.activeChapterId);
}

export async function getEventAction(eventId: string) {
  await requireCommunitySession();
  return getEvent(eventId);
}

export async function createEventAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const parsed = eventSchema.parse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    location: formData.get('location') || null,
    starts_at: formData.get('starts_at'),
    ends_at: formData.get('ends_at') || null,
    capacity: formData.get('capacity') || null,
    registration_deadline: formData.get('registration_deadline') || null,
    banner_url: formData.get('banner_url') || null,
    registration_open: formData.get('registration_open') !== 'false',
  });

  await createEvent({
    chapter_id: session.activeChapterId,
    created_by: session.user.id,
    ...parsed,
    capacity: parsed.capacity ?? null,
  });

  revalidatePath('/app/events');
  revalidatePath('/app/events/manage');
  revalidatePath('/app/dashboard');
}

export async function updateEventAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const eventId = z.string().uuid().parse(formData.get('event_id'));
  const parsed = eventSchema.partial().parse({
    title: formData.get('title') || undefined,
    description: formData.get('description') || null,
    location: formData.get('location') || null,
    starts_at: formData.get('starts_at') || undefined,
    ends_at: formData.get('ends_at') || null,
    capacity: formData.get('capacity') || null,
    registration_deadline: formData.get('registration_deadline') || null,
    banner_url: formData.get('banner_url') || null,
    registration_open:
      formData.get('registration_open') === null
        ? undefined
        : formData.get('registration_open') !== 'false',
  });

  await updateEvent(eventId, session.activeChapterId, parsed);
  revalidatePath('/app/events');
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath('/app/events/manage');
}

export async function registerAction(formData: FormData) {
  const session = await requireCommunitySession();
  const eventId = z.string().uuid().parse(formData.get('event_id'));
  await register(eventId, session.user.id);
  const event = await getEvent(eventId);

  await recordContribution({
    user_id: session.user.id,
    chapter_id: session.activeChapterId,
    action_type: 'event_register',
    description: 'Registered for an event',
    points: POINT_VALUES.event_register,
    recorded_by: session.user.id,
    metadata: { event_id: eventId },
  });

  if (event) {
    await createNotification({
      user_id: session.user.id,
      type: 'event_reminder',
      title: 'Event registration confirmed',
      body: `You are registered for ${event.title}.`,
      link_path: `/app/events/${eventId}`,
    });
  }

  revalidatePath('/app/events');
  revalidatePath(`/app/events/${eventId}`);
}

export async function cancelRegistrationAction(formData: FormData) {
  const session = await requireCommunitySession();
  const eventId = z.string().uuid().parse(formData.get('event_id'));
  await cancelRegistration(eventId, session.user.id);
  revalidatePath('/app/events');
  revalidatePath(`/app/events/${eventId}`);
}

export async function markAttendanceAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const eventId = z.string().uuid().parse(formData.get('event_id'));
  const userId = z.string().uuid().parse(formData.get('user_id'));
  const attended = formData.get('attended') !== 'false';

  await markAttendance(eventId, userId, attended);

  if (attended) {
    await recordContribution({
      user_id: userId,
      chapter_id: session.activeChapterId,
      action_type: 'event_attend',
      description: 'Attended an event',
      points: POINT_VALUES.event_attend,
      recorded_by: session.user.id,
      metadata: { event_id: eventId },
    });
  }

  revalidatePath(`/app/events/${eventId}`);
  revalidatePath('/app/events/manage');
}

export async function exportAttendanceCsvAction(eventId: string) {
  await requireLeaderAccess();
  return exportAttendanceCsv(eventId);
}
