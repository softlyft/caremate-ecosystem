import type { MembershipRole } from '@/types/database';

export const COMMUNITY_ROLES = ['member', 'lead', 'deputy'] as const satisfies readonly MembershipRole[];

export const ROLE_LABELS: Record<MembershipRole, string> = {
  member: 'Member',
  lead: 'Chapter Lead',
  deputy: 'Deputy Lead',
};

export function isCommunityRole(value: unknown): value is MembershipRole {
  return typeof value === 'string' && (COMMUNITY_ROLES as readonly string[]).includes(value);
}

export function isLeaderRole(role: MembershipRole): boolean {
  return role === 'lead' || role === 'deputy';
}

export function canManageChapter(role: MembershipRole): boolean {
  return isLeaderRole(role);
}
