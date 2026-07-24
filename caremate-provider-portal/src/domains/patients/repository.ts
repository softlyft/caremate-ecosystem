import { createClient } from '@/lib/supabase/server';
import { listPatientActivities } from '@/domains/activity/repository';
import { getOrgMembershipForUser, listActiveMembershipsForUsers } from '@/domains/members/repository';
import type {
  EmergencyProfile,
  PatientProviderActivity,
  PatientProviderConnection,
  Profile,
  ProviderDocument,
  ProviderOrgMember,
} from '@/types/database';

export type ConnectedPatientRow = {
  connection: PatientProviderConnection;
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone' | 'avatar_url' | 'date_of_birth'> | null;
  lastActivityAt: string | null;
  membership: ProviderOrgMember | null;
};

export type PatientDetail = {
  connection: PatientProviderConnection;
  profile: Profile | null;
  gender: string;
  emergency: EmergencyProfile | null;
  documents: ProviderDocument[];
  activities: PatientProviderActivity[];
  membership: ProviderOrgMember | null;
};

export async function listConnectedPatients(
  organizationId: string,
  options?: { search?: string; limit?: number; offset?: number },
): Promise<{ rows: ConnectedPatientRow[]; total: number }> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { data, error, count } = await supabase
    .from('patient_provider_connections')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  const connections = (data ?? []) as PatientProviderConnection[];
  if (!connections.length) return { rows: [], total: count ?? 0 };

  const patientIds = connections.map((c) => c.patient_id);
  const [{ data: profiles }, { data: activities }, memberships] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, full_name, patient_id, phone, avatar_url, date_of_birth')
      .in('user_id', patientIds),
    supabase
      .from('patient_provider_activities')
      .select('patient_id, created_at')
      .eq('organization_id', organizationId)
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false }),
    listActiveMembershipsForUsers(organizationId, patientIds),
  ]);

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const lastActivityByPatient = new Map<string, string>();
  for (const a of activities ?? []) {
    if (!lastActivityByPatient.has(a.patient_id)) {
      lastActivityByPatient.set(a.patient_id, a.created_at);
    }
  }

  const q = options?.search?.trim().toLowerCase();
  let rows: ConnectedPatientRow[] = connections.map((connection) => {
    const p = profileByUser.get(connection.patient_id);
    return {
      connection,
      profile: p
        ? {
            full_name: p.full_name,
            patient_id: p.patient_id,
            phone: p.phone,
            avatar_url: p.avatar_url,
            date_of_birth: p.date_of_birth,
          }
        : null,
      lastActivityAt: lastActivityByPatient.get(connection.patient_id) ?? null,
      membership: memberships.get(connection.patient_id) ?? null,
    };
  });

  if (q) {
    rows = rows.filter((r) => {
      const name = r.profile?.full_name?.toLowerCase() ?? '';
      const caremateId = r.profile?.patient_id?.toLowerCase() ?? '';
      const phone = r.profile?.phone?.toLowerCase() ?? '';
      return name.includes(q) || caremateId.includes(q) || phone.includes(q);
    });
  }

  return { rows, total: count ?? rows.length };
}

export async function getPatientDetail(
  organizationId: string,
  patientUserId: string,
): Promise<PatientDetail | null> {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from('patient_provider_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('patient_id', patientUserId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) throw error;
  if (!connection) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', patientUserId)
    .maybeSingle();

  const scopes = connection.shared_scopes ?? [];
  let emergency: EmergencyProfile | null = null;
  if (scopes.includes('emergency')) {
    const { data: ep } = await supabase
      .from('emergency_profiles')
      .select('*')
      .eq('user_id', patientUserId)
      .maybeSingle();
    emergency = (ep as EmergencyProfile | null) ?? null;
  }

  const { data: documents } = await supabase
    .from('provider_documents')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('patient_id', patientUserId)
    .order('created_at', { ascending: false });

  const activities = await listPatientActivities(organizationId, patientUserId);
  const membership = await getOrgMembershipForUser(organizationId, patientUserId);
  const genderRaw =
    profile && 'gender' in profile ? (profile as { gender?: string | null }).gender : null;
  const gender = genderRaw?.trim() ? genderRaw : '—';

  return {
    connection: connection as PatientProviderConnection,
    profile: (profile as Profile | null) ?? null,
    gender,
    emergency,
    documents: (documents ?? []) as ProviderDocument[],
    activities,
    membership,
  };
}
