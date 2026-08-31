import { createClient } from '@/lib/supabase/server';

export type CareCoordinationStaffCandidate = {
  user_id: string;
  full_name: string;
  already_added: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<any> {
  return createClient();
}

export async function listCareCoordinationStaffCandidates(
  conversationId: string,
): Promise<CareCoordinationStaffCandidate[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc('list_care_coordination_staff_candidates', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return (data ?? []) as CareCoordinationStaffCandidate[];
}

export async function addCareCoordinationStaff(
  conversationId: string,
  userId: string,
): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.rpc('add_care_coordination_staff', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });
  if (error) throw error;
}
