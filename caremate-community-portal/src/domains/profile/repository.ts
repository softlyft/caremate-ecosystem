import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/types/database';

/** Reads the canonical CareMate app profile; community membership does not copy user data. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}
