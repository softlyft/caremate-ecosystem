import { createClient } from '@/lib/supabase/server';
import { countAppointments } from '@/domains/appointments/repository';
import { countBroadcasts } from '@/domains/broadcasts/repository';
import { countConnections } from '@/domains/connections/repository';
import { countDocuments } from '@/domains/documents/repository';

export type AnalyticsSnapshot = {
  connectedPatients: number;
  pendingRequests: number;
  appointmentRequests: number;
  documentsShared: number;
  broadcastsSent: number;
  newPatientsThisMonth: number;
  patientGrowth: { month: string; count: number }[];
  documentsByMonth: { month: string; count: number }[];
  messagesDelivered: number;
};

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export async function getAnalyticsSnapshot(organizationId: string): Promise<AnalyticsSnapshot> {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    connectedPatients,
    pendingRequests,
    appointmentRequests,
    documentsShared,
    broadcastsSent,
  ] = await Promise.all([
    countConnections(organizationId, 'approved'),
    countConnections(organizationId, 'pending'),
    countAppointments(organizationId),
    countDocuments(organizationId),
    countBroadcasts(organizationId, 'sent'),
  ]);

  const { count: newPatientsThisMonth } = await supabase
    .from('patient_provider_connections')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .gte('approved_at', startOfMonth.toISOString());

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [{ data: growthRows }, { data: docRows }, { data: sentBroadcasts }] = await Promise.all([
    supabase
      .from('patient_provider_connections')
      .select('approved_at')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .gte('approved_at', sixMonthsAgo.toISOString()),
    supabase
      .from('provider_documents')
      .select('created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', sixMonthsAgo.toISOString()),
    supabase
      .from('provider_broadcasts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'sent'),
  ]);

  const broadcastIds = (sentBroadcasts ?? []).map((b) => b.id);
  let messagesDelivered = 0;
  if (broadcastIds.length) {
    const { count } = await supabase
      .from('provider_broadcast_recipients')
      .select('id', { count: 'exact', head: true })
      .in('broadcast_id', broadcastIds);
    messagesDelivered = count ?? 0;
  }

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const growthMap = new Map(months.map((m) => [m, 0]));
  for (const row of growthRows ?? []) {
    if (!row.approved_at) continue;
    const key = monthKey(row.approved_at);
    if (growthMap.has(key)) growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }

  const docsMap = new Map(months.map((m) => [m, 0]));
  for (const row of docRows ?? []) {
    const key = monthKey(row.created_at);
    if (docsMap.has(key)) docsMap.set(key, (docsMap.get(key) ?? 0) + 1);
  }

  return {
    connectedPatients,
    pendingRequests,
    appointmentRequests,
    documentsShared,
    broadcastsSent,
    newPatientsThisMonth: newPatientsThisMonth ?? 0,
    patientGrowth: months.map((month) => ({ month, count: growthMap.get(month) ?? 0 })),
    documentsByMonth: months.map((month) => ({ month, count: docsMap.get(month) ?? 0 })),
    messagesDelivered,
  };
}
