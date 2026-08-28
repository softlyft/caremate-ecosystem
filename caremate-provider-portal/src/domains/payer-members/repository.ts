import { createClient } from '@/lib/supabase/server';
import type { PayerOrgMemberRow } from '@/types/database';

export type MarkPayerStaffInput = {
  organizationId: string;
  patientUserId: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  position?: string | null;
  displayName?: string | null;
};

export async function getPayerOrgMembershipForUser(
  organizationId: string,
  userId: string,
): Promise<PayerOrgMemberRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payer_org_members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as PayerOrgMemberRow | null) ?? null;
}

export async function markConnectedPatientAsPayerStaff(
  input: MarkPayerStaffInput,
): Promise<PayerOrgMemberRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mark_connected_patient_as_payer_staff', {
    p_organization_id: input.organizationId,
    p_patient_user_id: input.patientUserId,
    p_company_email: input.companyEmail?.trim() || undefined,
    p_company_phone: input.companyPhone?.trim() || undefined,
    p_position: input.position?.trim() || undefined,
    p_display_name: input.displayName?.trim() || undefined,
  });

  if (error) throw error;
  if (!data) throw new Error('Could not mark patient as staff');
  return data as PayerOrgMemberRow;
}
