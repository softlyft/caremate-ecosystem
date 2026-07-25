import { createAdminClient } from '@/lib/supabase/admin';
import { isStaffRole, type StaffRole } from '@/constants/roles';
import { listAllAuthUsers } from '@/lib/list-auth-users';
import type { Profile } from '@/types/database';

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  role: StaffRole | null;
  profile: Profile | null;
  hasEmergencyProfile: boolean;
  hasSettings: boolean;
};

export async function listUsers(search?: string): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const users = await listAllAuthUsers();
  const ids = users.map((u) => u.id);

  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: emergencies }, { data: settings }] = await Promise.all([
    admin.from('profiles').select('*').in('user_id', ids),
    admin.from('emergency_profiles').select('user_id').in('user_id', ids),
    admin.from('settings').select('user_id').in('user_id', ids),
  ]);

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p as Profile]));
  const emergencySet = new Set((emergencies ?? []).map((e) => e.user_id));
  const settingsSet = new Set((settings ?? []).map((s) => s.user_id));

  const q = search?.trim().toLowerCase();

  return users
    .map((u) => {
      const roleRaw = u.app_metadata?.role;
      return {
        id: u.id,
        email: u.email ?? '—',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        bannedUntil: u.banned_until ?? null,
        role: isStaffRole(roleRaw) ? roleRaw : null,
        profile: profileByUser.get(u.id) ?? null,
        hasEmergencyProfile: emergencySet.has(u.id),
        hasSettings: settingsSet.has(u.id),
      } satisfies AdminUserRow;
    })
    .filter((u) => {
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.profile?.full_name?.toLowerCase().includes(q) ?? false) ||
        (u.profile?.phone?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUser(userId: string): Promise<AdminUserRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;

  const u = data.user;
  const [{ data: profile }, { data: emergencies }, { data: settings }] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('emergency_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    admin.from('settings').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  const roleRaw = u.app_metadata?.role;
  return {
    id: u.id,
    email: u.email ?? '—',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    bannedUntil: u.banned_until ?? null,
    role: isStaffRole(roleRaw) ? roleRaw : null,
    profile: (profile as Profile | null) ?? null,
    hasEmergencyProfile: Boolean(emergencies),
    hasSettings: Boolean(settings),
  };
}
