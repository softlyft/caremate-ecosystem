import { createClient } from '@/lib/supabase/server';
import type {
  CommunityEvent,
  CommunityEventRegistration,
  EventRegistrationStatus,
} from '@/types/database';

export async function listEvents(chapterId: string): Promise<CommunityEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('starts_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommunityEvent[];
}

export async function getEvent(eventId: string): Promise<CommunityEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw error;
  return (data as CommunityEvent | null) ?? null;
}

export type EventInput = {
  chapter_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  capacity?: number | null;
  registration_deadline?: string | null;
  banner_url?: string | null;
  registration_open?: boolean;
  created_by?: string | null;
};

export async function createEvent(input: EventInput): Promise<CommunityEvent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_events')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityEvent;
}

export async function updateEvent(
  eventId: string,
  chapterId: string,
  input: Partial<Omit<EventInput, 'chapter_id' | 'created_by'>>,
): Promise<CommunityEvent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_events')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('chapter_id', chapterId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityEvent;
}

export async function register(
  eventId: string,
  userId: string,
): Promise<CommunityEventRegistration> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_event_registrations')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: 'registered',
        registered_at: new Date().toISOString(),
        attended_at: null,
      },
      { onConflict: 'event_id,user_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityEventRegistration;
}

export async function cancelRegistration(
  eventId: string,
  userId: string,
): Promise<CommunityEventRegistration> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_event_registrations')
    .update({ status: 'cancelled' satisfies EventRegistrationStatus })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityEventRegistration;
}

export async function markAttendance(
  eventId: string,
  userId: string,
  attended: boolean,
): Promise<CommunityEventRegistration> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_event_registrations')
    .update({
      status: (attended ? 'attended' : 'no_show') as EventRegistrationStatus,
      attended_at: attended ? new Date().toISOString() : null,
    })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityEventRegistration;
}

export async function listRegistrations(
  eventId: string,
): Promise<CommunityEventRegistration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommunityEventRegistration[];
}

export async function exportAttendanceCsv(eventId: string): Promise<string> {
  const registrations = await listRegistrations(eventId);
  const header = 'user_id,status,registered_at,attended_at';
  const rows = registrations.map(
    (r) =>
      `${r.user_id},${r.status},${r.registered_at},${r.attended_at ?? ''}`,
  );
  return [header, ...rows].join('\n');
}
