import { createClient } from '@/lib/supabase/server';
import { positiveLimit, rpcCount } from '@/lib/rpc-error';

export type ProviderOrgEntitlements = {
  plan_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  billing_interval: 'monthly' | 'yearly' | null;
  pct_seat_limit: number;
  patient_connection_cap: number;
  payer_connection_cap: number;
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
  approvedPayerConnectionCount: number;
};

const FREE: ProviderOrgEntitlements = {
  plan_tier: 'free',
  billing_interval: null,
  pct_seat_limit: 2,
  patient_connection_cap: 20,
  payer_connection_cap: 3,
  voice_minutes_included: 0,
  video_minutes_included: 0,
  status: 'active',
  subscription_id: null,
};

function coerceProviderEntitlements(raw: unknown): ProviderOrgEntitlements {
  const row =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Partial<ProviderOrgEntitlements>)
      : {};

  return {
    ...FREE,
    ...row,
    plan_tier: row.plan_tier ?? FREE.plan_tier,
    billing_interval: row.billing_interval ?? FREE.billing_interval,
    status: row.status ?? FREE.status,
    subscription_id: row.subscription_id ?? FREE.subscription_id,
    current_period_end: row.current_period_end ?? FREE.current_period_end,
    pct_seat_limit: positiveLimit(row.pct_seat_limit, FREE.pct_seat_limit),
    patient_connection_cap: positiveLimit(row.patient_connection_cap, FREE.patient_connection_cap),
    payer_connection_cap: positiveLimit(row.payer_connection_cap, FREE.payer_connection_cap),
    voice_minutes_included: Math.max(
      0,
      positiveLimit(row.voice_minutes_included, FREE.voice_minutes_included),
    ),
    video_minutes_included: Math.max(
      0,
      positiveLimit(row.video_minutes_included, FREE.video_minutes_included),
    ),
  };
}

export async function getProviderOrgPlanUsage(
  organizationId: string,
): Promise<ProviderOrgPlanUsage> {
  const supabase = await createClient();

  const { data: entitlementsRaw, error: entError } = await supabase.rpc(
    'provider_org_entitlements',
    { p_org_id: organizationId },
  );

  const entitlements = entError
    ? FREE
    : coerceProviderEntitlements(entitlementsRaw);

  const [
    { data: pctCount, error: pctError },
    { data: patientCount, error: patientError },
    { data: payerCount, error: payerError },
  ] = await Promise.all([
    supabase.rpc('provider_org_pct_member_count', { p_org_id: organizationId }),
    supabase.rpc('provider_org_approved_patient_count', { p_org_id: organizationId }),
    supabase.rpc('provider_org_approved_payer_connection_count', { p_org_id: organizationId }),
  ]);

  if (process.env.NODE_ENV === 'development') {
    for (const error of [entError, pctError, patientError, payerError]) {
      if (error) {
        console.warn('[getProviderOrgPlanUsage] RPC fallback:', error.message);
      }
    }
  }

  return {
    entitlements,
    pctMemberCount: pctError ? 0 : rpcCount(pctCount),
    approvedPatientCount: patientError ? 0 : rpcCount(patientCount),
    approvedPayerConnectionCount: payerError ? 0 : rpcCount(payerCount),
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
