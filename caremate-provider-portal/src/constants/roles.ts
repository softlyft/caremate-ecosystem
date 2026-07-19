import type { ProviderMemberRole } from '@/types/database';

export const PROVIDER_ROLES = [
  'owner',
  'administrator',
  'staff',
  'viewer',
] as const satisfies readonly ProviderMemberRole[];

export const PROVIDER_ROLE_LABELS: Record<ProviderMemberRole, string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  staff: 'Staff',
  viewer: 'Viewer',
};

export function isProviderRole(value: unknown): value is ProviderMemberRole {
  return typeof value === 'string' && (PROVIDER_ROLES as readonly string[]).includes(value);
}

export function canManageOrg(role: ProviderMemberRole): boolean {
  return role === 'owner' || role === 'administrator';
}

export function canWriteOrg(role: ProviderMemberRole): boolean {
  return role === 'owner' || role === 'administrator' || role === 'staff';
}
