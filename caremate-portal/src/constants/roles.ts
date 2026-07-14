export const STAFF_ROLES = ['admin', 'editor', 'support'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  support: 'Support',
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

export function canManageUsers(role: StaffRole | null | undefined): boolean {
  return role === 'admin' || role === 'support';
}

export function canEditCatalog(role: StaffRole | null | undefined): boolean {
  return role === 'admin' || role === 'editor';
}

export function canAssignRoles(role: StaffRole | null | undefined): boolean {
  return role === 'admin';
}
