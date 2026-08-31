import { createClient } from '@/lib/supabase/server';
import { getPayerOrgMembershipForUser } from '@/domains/payer-members/repository';
import type { PatientPayerConnection, Profile, PayerOrgMemberRow } from '@/types/database';

export type PayerPatientDetail = {
  connection: PatientPayerConnection;
  profile: Pick<Profile, 'full_name' | 'patient_id' | 'phone' | 'date_of_birth' | 'avatar_url'> | null;
  membership: PayerOrgMemberRow | null;
};

export async function getPayerPatientDetail(
  organizationId: string,
  patientUserId: string,
): Promise<PayerPatientDetail | null> {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from('patient_payer_connections')
    .select('*')
    .eq('payer_organization_id', organizationId)
    .eq('patient_id', patientUserId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) throw error;
  if (!connection) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, patient_id, phone, date_of_birth, avatar_url')
    .eq('user_id', patientUserId)
    .maybeSingle();

  const membership = await getPayerOrgMembershipForUser(organizationId, patientUserId);

  return {
    connection: connection as PatientPayerConnection,
    profile: profile ?? null,
    membership,
  };
}
