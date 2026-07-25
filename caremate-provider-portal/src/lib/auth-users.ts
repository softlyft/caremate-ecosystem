import type { User } from '@supabase/supabase-js';

import { normalizeEmail } from '@/domains/claim/crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/** Resolve Auth user by email via DB RPC (no listUsers pagination). */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  const { data: userId, error } = await admin.rpc('get_auth_user_id_by_email', {
    p_email: normalized,
  });

  if (error) throw error;
  if (!userId) return null;

  const fetched = await admin.auth.admin.getUserById(String(userId));
  if (fetched.error) throw fetched.error;
  return fetched.data.user ?? null;
}
