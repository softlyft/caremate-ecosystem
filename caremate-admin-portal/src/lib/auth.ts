import { createClient } from '@/lib/supabase/server';
import { isStaffRole, type StaffRole } from '@/constants/roles';
import type { User } from '@supabase/supabase-js';

export type PortalSession = {
  user: User;
  role: StaffRole;
};

export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = user.app_metadata?.role;
  if (!isStaffRole(role)) return null;

  return { user, role };
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
