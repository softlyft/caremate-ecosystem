import { createClient } from '@/lib/supabase/server';
import type { CommunityContribution, Json } from '@/types/database';

export type ContributionInput = {
  user_id: string;
  chapter_id?: string | null;
  action_type: string;
  description?: string | null;
  points?: number;
  metadata?: Json;
  recorded_by?: string | null;
};

export async function recordContribution(
  input: ContributionInput,
): Promise<CommunityContribution> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_contributions')
    .insert({
      user_id: input.user_id,
      chapter_id: input.chapter_id ?? null,
      action_type: input.action_type,
      description: input.description ?? null,
      points: input.points ?? 0,
      metadata: input.metadata ?? {},
      recorded_by: input.recorded_by ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityContribution;
}

export async function listForUser(
  userId: string,
  limit = 50,
): Promise<CommunityContribution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_contributions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CommunityContribution[];
}

export type ContributionSummary = {
  totalPoints: number;
  totalActions: number;
  byActionType: Record<string, number>;
};

export async function getSummary(userId: string): Promise<ContributionSummary> {
  const contributions = await listForUser(userId, 500);
  const byActionType: Record<string, number> = {};
  let totalPoints = 0;

  for (const c of contributions) {
    totalPoints += c.points;
    byActionType[c.action_type] = (byActionType[c.action_type] ?? 0) + c.points;
  }

  return {
    totalPoints,
    totalActions: contributions.length,
    byActionType,
  };
}
