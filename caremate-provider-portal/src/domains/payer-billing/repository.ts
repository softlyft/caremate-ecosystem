import { createClient } from '@/lib/supabase/server';

export type PayerOrgEntitlements = {
  plan_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  billing_interval: 'monthly' | 'yearly' | null;
  support_team_seat_limit: number;
  patient_connection_cap: number;
  provider_connection_cap: number;
  voice_minutes_included: number;
  group_chat_enabled: boolean;
  status: string;
  subscription_id: string | null;
  current_period_end?: string | null;
};

export type PayerOrgPlanUsage = {
  entitlements: PayerOrgEntitlements;
  supportTeamMemberCount: number;
  approvedPatientCount: number;
  approvedProviderConnectionCount: number;
};

const FREE: PayerOrgEntitlements = {
  plan_tier: 'free',
  billing_interval: null,
  support_team_seat_limit: 2,
  patient_connection_cap: 7,
  provider_connection_cap: 3,
  voice_minutes_included: 0,
  group_chat_enabled: false,
  status: 'active',
  subscription_id: null,
};

export async function getPayerOrgPlanUsage(
  organizationId: string,
): Promise<PayerOrgPlanUsage> {
  const supabase = await createClient();

  const { data: entitlementsRaw, error: entError } = await supabase.rpc(
    'payer_org_entitlements',
    { p_org_id: organizationId },
  );
  if (entError) throw entError;

  const entitlements = {
    ...FREE,
    ...((entitlementsRaw ?? {}) as Partial<PayerOrgEntitlements>),
  } as PayerOrgEntitlements;

  const [{ data: teamCount }, { data: patientCount }, { data: providerCount }] = await Promise.all([
    supabase.rpc('payer_org_support_team_member_count', { p_org_id: organizationId }),
    supabase.rpc('payer_org_approved_patient_count', { p_org_id: organizationId }),
    supabase.rpc('payer_org_approved_provider_connection_count', { p_org_id: organizationId }),
  ]);

  return {
    entitlements,
    supportTeamMemberCount:
      typeof teamCount === 'number' ? teamCount : Number(teamCount ?? 0),
    approvedPatientCount:
      typeof patientCount === 'number' ? patientCount : Number(patientCount ?? 0),
    approvedProviderConnectionCount:
      typeof providerCount === 'number' ? providerCount : Number(providerCount ?? 0),
  };
}

export async function setSupportTeamMember(input: {
  organizationId: string;
  userId: string;
  enabled: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_support_team_member', {
    p_organization_id: input.organizationId,
    p_user_id: input.userId,
    p_enabled: input.enabled,
  });
  if (error) throw error;
  return data;
}
