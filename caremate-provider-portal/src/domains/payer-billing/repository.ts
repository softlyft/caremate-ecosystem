import { createClient } from '@/lib/supabase/server';
import { positiveLimit, rpcCount } from '@/lib/rpc-error';

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

function coercePayerEntitlements(raw: unknown): PayerOrgEntitlements {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Partial<PayerOrgEntitlements>)
      : {};

  return {
    ...FREE,
    ...row,
    plan_tier: row.plan_tier ?? FREE.plan_tier,
    billing_interval: row.billing_interval ?? FREE.billing_interval,
    status: row.status ?? FREE.status,
    subscription_id: row.subscription_id ?? FREE.subscription_id,
    current_period_end: row.current_period_end ?? FREE.current_period_end,
    group_chat_enabled: row.group_chat_enabled ?? FREE.group_chat_enabled,
    support_team_seat_limit: positiveLimit(row.support_team_seat_limit, FREE.support_team_seat_limit),
    patient_connection_cap: positiveLimit(row.patient_connection_cap, FREE.patient_connection_cap),
    provider_connection_cap: positiveLimit(row.provider_connection_cap, FREE.provider_connection_cap),
    voice_minutes_included: Math.max(
      0,
      positiveLimit(row.voice_minutes_included, FREE.voice_minutes_included),
    ),
  };
}

export async function getPayerOrgPlanUsage(
  organizationId: string,
): Promise<PayerOrgPlanUsage> {
  const supabase = await createClient();

  const { data: entitlementsRaw, error: entError } = await supabase.rpc(
    'payer_org_entitlements',
    { p_org_id: organizationId },
  );

  const entitlements = entError ? FREE : coercePayerEntitlements(entitlementsRaw);

  const [
    { data: teamCount, error: teamError },
    { data: patientCount, error: patientError },
    { data: providerCount, error: providerError },
  ] = await Promise.all([
    supabase.rpc('payer_org_support_team_member_count', { p_org_id: organizationId }),
    supabase.rpc('payer_org_approved_patient_count', { p_org_id: organizationId }),
    supabase.rpc('payer_org_approved_provider_connection_count', { p_org_id: organizationId }),
  ]);

  if (process.env.NODE_ENV === 'development') {
    for (const error of [entError, teamError, patientError, providerError]) {
      if (error) {
        console.warn('[getPayerOrgPlanUsage] RPC fallback:', error.message);
      }
    }
  }

  return {
    entitlements,
    supportTeamMemberCount: teamError ? 0 : rpcCount(teamCount),
    approvedPatientCount: patientError ? 0 : rpcCount(patientCount),
    approvedProviderConnectionCount: providerError ? 0 : rpcCount(providerCount),
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
