import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import type { ProviderBroadcast } from '@/types/database';

export async function listBroadcasts(organizationId: string): Promise<ProviderBroadcast[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_broadcasts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProviderBroadcast[];
}

export async function countBroadcasts(
  organizationId: string,
  status?: ProviderBroadcast['status'],
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from('provider_broadcasts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function sendBroadcast(input: {
  organizationId: string;
  createdBy: string;
  title: string;
  message: string;
  audience: 'all' | 'selected';
  patientIds?: string[];
  expiresAt?: string | null;
}): Promise<ProviderBroadcast> {
  const supabase = await createClient();

  let recipientIds = input.patientIds ?? [];
  if (input.audience === 'all') {
    const { data: connections, error } = await supabase
      .from('patient_provider_connections')
      .select('patient_id')
      .eq('organization_id', input.organizationId)
      .eq('status', 'approved');
    if (error) throw error;
    recipientIds = (connections ?? []).map((c) => c.patient_id);
  } else {
    // Only send to approved connections among the selected set
    const { data: connections, error } = await supabase
      .from('patient_provider_connections')
      .select('patient_id')
      .eq('organization_id', input.organizationId)
      .eq('status', 'approved')
      .in('patient_id', recipientIds.length ? recipientIds : ['00000000-0000-0000-0000-000000000000']);
    if (error) throw error;
    recipientIds = (connections ?? []).map((c) => c.patient_id);
  }

  const now = new Date().toISOString();
  const { data: broadcast, error: insertError } = await supabase
    .from('provider_broadcasts')
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      message: input.message,
      audience: input.audience,
      status: 'sent',
      expires_at: input.expiresAt ?? null,
      created_by: input.createdBy,
      sent_at: now,
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  if (recipientIds.length) {
    const { error: recipError } = await supabase.from('provider_broadcast_recipients').insert(
      recipientIds.map((patient_id) => ({
        broadcast_id: broadcast.id,
        patient_id,
      })),
    );
    if (recipError) throw recipError;

    await Promise.all(
      recipientIds.map((patientId) =>
        insertActivity({
          organizationId: input.organizationId,
          patientId,
          eventType: 'broadcast_delivered',
          summary: `Broadcast delivered: ${input.title}`,
          metadata: { broadcast_id: broadcast.id },
        }),
      ),
    );
  }

  return broadcast as ProviderBroadcast;
}
