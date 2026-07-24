import { createClient } from '@/lib/supabase/server';
import type { ProviderOrgMember } from '@/types/database';

export type MarkAsStaffInput = {
  organizationId: string;
  patientUserId: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  position?: string | null;
  displayName?: string | null;
};

export async function getOrgMembershipForUser(
  organizationId: string,
  userId: string,
): Promise<ProviderOrgMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_org_members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as ProviderOrgMember | null) ?? null;
}

export async function listActiveMembershipsForUsers(
  organizationId: string,
  userIds: string[],
): Promise<Map<string, ProviderOrgMember>> {
  const map = new Map<string, ProviderOrgMember>();
  if (!userIds.length) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_org_members')
    .select('*')
    .eq('organization_id', organizationId)
    .in('user_id', userIds)
    .is('deleted_at', null);

  if (error) throw error;
  for (const row of (data ?? []) as ProviderOrgMember[]) {
    map.set(row.user_id, row);
  }
  return map;
}

export async function markConnectedPatientAsStaff(
  input: MarkAsStaffInput,
): Promise<ProviderOrgMember> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mark_connected_patient_as_staff', {
    p_organization_id: input.organizationId,
    p_patient_user_id: input.patientUserId,
    p_company_email: input.companyEmail?.trim() || undefined,
    p_company_phone: input.companyPhone?.trim() || undefined,
    p_position: input.position?.trim() || undefined,
    p_display_name: input.displayName?.trim() || undefined,
  });

  if (error) throw error;
  if (!data) throw new Error('Could not mark patient as staff');
  return data as ProviderOrgMember;
}
