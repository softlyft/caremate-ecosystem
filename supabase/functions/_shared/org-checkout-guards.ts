import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type OrgPlanTier = 'basic' | 'pro';
type BillingInterval = 'monthly' | 'yearly';

const TIER_RANK: Record<OrgPlanTier, number> = { basic: 1, pro: 2 };
const INTERVAL_RANK: Record<BillingInterval, number> = { monthly: 1, yearly: 2 };

function rank(tier: OrgPlanTier, interval: BillingInterval): number {
  return TIER_RANK[tier] * 10 + INTERVAL_RANK[interval];
}

/**
 * Org plans are upgrade-only (or same-plan renewal).
 * Blocks Pro→Basic and yearly→monthly. Allows basic→pro, monthly→yearly, and
 * same tier+interval (renewal / new period via finalize).
 */
export async function assertOrgCheckoutIsUpgradeOrRenewal(
  service: SupabaseClient,
  params: {
    table: 'provider_org_subscriptions' | 'payer_org_subscriptions';
    organizationId: string;
    planTier: OrgPlanTier;
    billingInterval: BillingInterval;
  },
): Promise<void> {
  const { data: current } = await service
    .from(params.table)
    .select('plan_tier, billing_interval, current_period_end')
    .eq('organization_id', params.organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!current) {
    return;
  }

  const end = current.current_period_end ? Date.parse(String(current.current_period_end)) : NaN;
  if (!Number.isNaN(end) && end <= Date.now()) {
    return;
  }

  const currentTier = current.plan_tier as string;
  const currentInterval = current.billing_interval as string;
  if (
    (currentTier !== 'basic' && currentTier !== 'pro') ||
    (currentInterval !== 'monthly' && currentInterval !== 'yearly')
  ) {
    return;
  }

  const from = rank(currentTier, currentInterval);
  const to = rank(params.planTier, params.billingInterval);
  if (to < from) {
    throw new Error(
      `Downgrades are not supported. Your organization is on ${currentTier} ${currentInterval}; choose the same plan to renew or a higher tier/interval to upgrade.`,
    );
  }
}

/** After a plan change, disable excess non-admin seat flags beyond the new limit. */
export async function pruneOrgSeatsToLimit(
  service: SupabaseClient,
  params: {
    kind: 'provider' | 'payer';
    organizationId: string;
    seatLimit: number;
  },
): Promise<void> {
  const table =
    params.kind === 'provider' ? 'provider_org_members' : 'payer_org_members';
  const flag = params.kind === 'provider' ? 'private_care_team' : 'support_team';

  const { data: seated } = await service
    .from(table)
    .select('id, role, updated_at')
    .eq('organization_id', params.organizationId)
    .is('deleted_at', null)
    .eq(flag, true)
    .order('updated_at', { ascending: true });

  const rows = seated ?? [];
  if (rows.length <= params.seatLimit) {
    return;
  }

  // Keep newest seats up to the limit (owner/admin seats still count toward the cap).
  const toDisable = rows.slice(0, rows.length - params.seatLimit).map((row) => row.id);
  if (toDisable.length === 0) {
    return;
  }

  await service
    .from(table)
    .update({ [flag]: false, updated_at: new Date().toISOString() })
    .in('id', toDisable);
}
