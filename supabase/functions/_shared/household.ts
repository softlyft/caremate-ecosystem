import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

/**
 * Ensure the authenticated user belongs to the household (member or creator).
 * Prevents clients from attaching Family billing to an arbitrary household_id.
 */
export async function assertHouseholdMembership(
  service: SupabaseClient,
  userId: string,
  householdId: string,
): Promise<void> {
  const { data: member, error: memberError } = await service
    .from('family_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('linked_user_id', userId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (member) return;

  const { data: household, error: householdError } = await service
    .from('family_households')
    .select('id')
    .eq('id', householdId)
    .eq('created_by_user_id', userId)
    .maybeSingle();

  if (householdError) throw new Error(householdError.message);
  if (household) return;

  throw new Error('You are not a member of this household');
}
