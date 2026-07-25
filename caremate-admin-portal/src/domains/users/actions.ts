'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalSession } from '@/lib/auth';
import {
  canAssignRoles,
  canManageUsers,
  isStaffRole,
  type StaffRole,
} from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { getWebsiteUrl } from '@/lib/site-url';

async function requireUserManager() {
  const session = await requirePortalSession();
  if (!canManageUsers(session.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

async function assertCanBanTarget(actorId: string, actorRole: StaffRole, targetUserId: string) {
  if (actorId === targetUserId) {
    throw new Error('You cannot ban your own account');
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(targetUserId);
  if (error) throw error;

  const targetRole = data.user.app_metadata?.role;
  if (isStaffRole(targetRole) && targetRole === 'admin' && actorRole !== 'admin') {
    throw new Error('Only admins can ban admin accounts');
  }
}

export async function banUser(userId: string) {
  const session = await requireUserManager();
  await assertCanBanTarget(session.user.id, session.role, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  });
  if (error) throw error;
  await writeAuditEvent({
    action: 'ban_user',
    entityType: 'user',
    entityId: userId,
    payload: { actor: session.user.id },
  });
  revalidatePath('/dashboard/users');
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function unbanUser(userId: string) {
  const session = await requireUserManager();
  const admin = createAdminClient();
  const { data, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError) throw getError;

  const targetRole = data.user.app_metadata?.role;
  if (isStaffRole(targetRole) && targetRole === 'admin' && session.role !== 'admin') {
    throw new Error('Only admins can unban admin accounts');
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (error) throw error;
  await writeAuditEvent({
    action: 'unban_user',
    entityType: 'user',
    entityId: userId,
  });
  revalidatePath('/dashboard/users');
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function sendPasswordReset(email: string) {
  await requireUserManager();
  const admin = createAdminClient();
  const redirectTo = `${getWebsiteUrl()}/auth/reset-password`;
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  await writeAuditEvent({
    action: 'password_reset',
    entityType: 'user',
    entityId: email,
    payload: { redirectTo },
  });
}

export async function setUserRole(userId: string, role: StaffRole | null) {
  const session = await requirePortalSession();
  if (!canAssignRoles(session.role)) {
    throw new Error('Only admins can assign roles');
  }
  if (role !== null && !isStaffRole(role)) {
    throw new Error('Invalid role');
  }

  const admin = createAdminClient();
  const { data: existing, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError) throw getError;

  const nextMeta = { ...(existing.user.app_metadata ?? {}) };
  if (role) {
    nextMeta.role = role;
  } else {
    delete nextMeta.role;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: nextMeta,
  });
  if (error) throw error;

  await writeAuditEvent({
    action: 'set_role',
    entityType: 'user',
    entityId: userId,
    payload: { role },
  });
  revalidatePath('/dashboard/users');
  revalidatePath(`/dashboard/users/${userId}`);
}
