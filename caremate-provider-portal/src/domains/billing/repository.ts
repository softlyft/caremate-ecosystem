import { createClient } from '@/lib/supabase/server';

export type ProviderOrgEntitlements = {
  plan_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  billing_interval: 'monthly' | 'yearly' | null;
  pct_seat_limit: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  video_minutes_included: number;
  status: string;
  subscription_id: string | null;
  current_period_end?: string | null;
};

export type ProviderOrgPlanUsage = {
  entitlements: ProviderOrgEntitlements;
  pctMemberCount: number;
  approvedPatientCount: number;
};

const FREE: ProviderOrgEntitlements = {
  plan_tier: 'free',
  billing_interval: null,
  pct_seat_limit: 1,
  patient_connection_cap: 5,
  voice_minutes_included: 0,
  video_minutes_included: 0,
  status: 'active',
  subscription_id: null,
};

export async function getProviderOrgPlanUsage(
  organizationId: string,
): Promise<ProviderOrgPlanUsage> {
  const supabase = await createClient();

  const { data: entitlementsRaw, error: entError } = await supabase.rpc(
    'provider_org_entitlements',
    { p_org_id: organizationId },
  );
  if (entError) throw entError;

  const entitlements = {
    ...FREE,
    ...((entitlementsRaw ?? {}) as Partial<ProviderOrgEntitlements>),
  } as ProviderOrgEntitlements;

  const [{ data: pctCount }, { data: patientCount }] = await Promise.all([
    supabase.rpc('provider_org_pct_member_count', { p_org_id: organizationId }),
    supabase.rpc('provider_org_approved_patient_count', { p_org_id: organizationId }),
  ]);

  return {
    entitlements,
    pctMemberCount: typeof pctCount === 'number' ? pctCount : Number(pctCount ?? 0),
    approvedPatientCount:
      typeof patientCount === 'number' ? patientCount : Number(patientCount ?? 0),
  };
}

export async function setPrivateCareTeamMember(input: {
  organizationId: string;
  userId: string;
  enabled: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_private_care_team_member', {
    p_organization_id: input.organizationId,
    p_user_id: input.userId,
    p_enabled: input.enabled,
  });
  if (error) throw error;
  return data;
}
