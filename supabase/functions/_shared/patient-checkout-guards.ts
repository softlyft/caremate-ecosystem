import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type PlanType = 'personal' | 'family';

function isPeriodStillValid(currentPeriodEnd: string | null | undefined): boolean {
  if (!currentPeriodEnd) return true;
  const end = Date.parse(currentPeriodEnd);
  if (Number.isNaN(end)) return true;
  return end > Date.now();
}

/**
 * Blocks checkout when the user already has Premium coverage they should not
 * repurchase (owned plan, or Family coverage as an invited household adult).
 * Personal → Family upgrades must use create-upgrade / IAP upgrade path unless
 * `allowPersonalToFamilyUpgrade` is set (store purchase upgrade flow).
 */
export async function assertPatientMayStartCheckout(
  service: SupabaseClient,
  userId: string,
  planType: PlanType,
  options: { allowPersonalToFamilyUpgrade?: boolean } = {},
): Promise<void> {
  const { data: owned } = await service
    .from('subscriptions')
    .select('id, plan_type, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing']);

  const activeOwned = (owned ?? []).filter((row) => isPeriodStillValid(row.current_period_end));
  const ownsPersonal = activeOwned.some((row) => row.plan_type === 'personal');
  const ownsFamily = activeOwned.some((row) => row.plan_type === 'family');

  if (ownsFamily) {
    throw new Error(
      'You already have Family Premium. Leave or wait for it to end before starting another plan.',
    );
  }

  if (planType === 'personal' && ownsPersonal) {
    throw new Error('You already have an active Standard Premium subscription.');
  }

  if (planType === 'family' && ownsPersonal && !options.allowPersonalToFamilyUpgrade) {
    throw new Error(
      'You already have Standard Premium. Use Upgrade to Family to apply your unused credit.',
    );
  }

  // Invited adults covered by someone else's Family plan must not buy another plan.
  const { data: spouseRows } = await service
    .from('family_members')
    .select('household_id')
    .eq('linked_user_id', userId)
    .eq('kind', 'spouse');

  const householdIds = (spouseRows ?? [])
    .map((row) => row.household_id as string | null)
    .filter((id): id is string => Boolean(id));

  if (householdIds.length === 0) {
    return;
  }

  const { data: coveringRows } = await service
    .from('subscriptions')
    .select('id, current_period_end')
    .eq('plan_type', 'family')
    .in('household_id', householdIds)
    .in('status', ['active', 'trialing']);

  const covering = (coveringRows ?? []).some((row) => isPeriodStillValid(row.current_period_end));
  if (covering) {
    throw new Error(
      'You are already covered by a Family Premium plan. Leave that household before subscribing to another plan.',
    );
  }
}
