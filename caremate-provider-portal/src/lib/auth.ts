import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { canManageOrg, canWriteOrg, isProviderRole } from '@/constants/roles';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE } from '@/constants/cookies';
import type { ProviderMemberRole } from '@/types/database';

export type ProviderMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: ProviderMemberRole;
  displayName: string | null;
};

export type ProviderSession = {
  user: User;
  memberships: ProviderMembership[];
  activeOrganizationId: string;
  activeRole: ProviderMemberRole;
  activeOrganizationName: string;
};

export async function getProviderSession(): Promise<ProviderSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: members, error } = await supabase
    .from('provider_org_members')
    .select('id, organization_id, role, display_name')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error || !members?.length) return null;

  const orgIds = members.map((m) => m.organization_id);
  const { data: orgs } = await supabase
    .from('provider_organizations')
    .select('id, name')
    .in('id', orgIds);

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const memberships: ProviderMembership[] = members
    .filter((m) => isProviderRole(m.role))
    .map((m) => ({
      id: m.id,
      organizationId: m.organization_id,
      organizationName: orgNameById.get(m.organization_id) ?? 'Organization',
      role: m.role as ProviderMemberRole,
      displayName: m.display_name,
    }));

  if (!memberships.length) return null;

  const cookieStore = await cookies();
  const cookieOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const active =
    memberships.find((m) => m.organizationId === cookieOrg) ?? memberships[0];

  return {
    user,
    memberships,
    activeOrganizationId: active.organizationId,
    activeRole: active.role,
    activeOrganizationName: active.organizationName,
  };
}

export async function requireProviderSession(): Promise<ProviderSession> {
  const session = await getProviderSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireWriteAccess(): Promise<ProviderSession> {
  const session = await requireProviderSession();
  if (!canWriteOrg(session.activeRole)) {
    throw new Error('Forbidden');
  }
  return session;
}

export async function requireManageAccess(): Promise<ProviderSession> {
  const session = await requireProviderSession();
  if (!canManageOrg(session.activeRole)) {
    throw new Error('Forbidden');
  }
  return session;
}
