import { createAdminClient } from '@/lib/supabase/admin';
import { isStaffRole, type StaffRole } from '@/constants/roles';
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
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const users = data.users;
  const ids = users.map((u) => u.id);

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
  const rows = await listUsers();
  return rows.find((u) => u.id === userId) ?? null;
}
