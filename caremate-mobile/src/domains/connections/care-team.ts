import { supabase } from '@/lib/supabase';

export type OrgCareTeamKind = 'provider' | 'payer';

export type OrgCareTeamMember = {
  userId: string;
  displayName: string;
  position: string | null;
  canMessage: boolean;
};

type RemoteCareTeamRow = {
  user_id: string;
  display_name: string;
  position: string | null;
  can_message: boolean;
};

function mapRow(row: RemoteCareTeamRow): OrgCareTeamMember {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    position: row.position,
    canMessage: row.can_message,
  };
}

export async function listConnectedOrgCareTeam(
  orgKind: OrgCareTeamKind,
  orgId: string,
): Promise<OrgCareTeamMember[]> {
  const { data, error } = await supabase.rpc('list_connected_org_care_team', {
    p_org_kind: orgKind,
    p_org_id: orgId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RemoteCareTeamRow[]).map(mapRow);
}
