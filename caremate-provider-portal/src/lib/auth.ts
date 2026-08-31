import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { canManageOrg, canWriteOrg, isProviderRole } from '@/constants/roles';
import { createClient } from '@/lib/supabase/server';
import {
  ACTIVE_ORG_COOKIE,
  CARE_ACTIVE_KIND_COOKIE,
  PAYER_ACTIVE_ORG_COOKIE,
} from '@/constants/cookies';
import type { CareOrgKind, ProviderMemberRole } from '@/types/database';

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

export type PayerMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: ProviderMemberRole;
  displayName: string | null;
};

export type PayerSession = {
  user: User;
  memberships: PayerMembership[];
  activeOrganizationId: string;
  activeRole: ProviderMemberRole;
  activeOrganizationName: string;
};

export type CareSessionSummary = {
  user: User;
  hasProvider: boolean;
  hasPayer: boolean;
  /** Preferred home when both exist: cookie, else provider. */
  homePath: '/app/dashboard' | '/payer/dashboard';
  preferredKind: CareOrgKind;
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

export async function getPayerSession(): Promise<PayerSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: members, error } = await supabase
    .from('payer_org_members')
    .select('id, organization_id, role, display_name')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error || !members?.length) return null;

  const orgIds = members.map((m) => m.organization_id);
  const { data: orgs } = await supabase
    .from('payer_organizations')
    .select('id, name')
    .in('id', orgIds);

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const memberships: PayerMembership[] = members
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
  const cookieOrg = cookieStore.get(PAYER_ACTIVE_ORG_COOKIE)?.value;
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

/** Resolve provider vs payer memberships for login / root redirects. Dual membership prefers cookie then provider. */
export async function getCareSession(): Promise<CareSessionSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ count: providerCount }, { count: payerCount }] = await Promise.all([
    supabase
      .from('provider_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('payer_org_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ]);

  const hasProvider = (providerCount ?? 0) > 0;
  const hasPayer = (payerCount ?? 0) > 0;
  if (!hasProvider && !hasPayer) return null;

  const cookieStore = await cookies();
  const kindCookie = cookieStore.get(CARE_ACTIVE_KIND_COOKIE)?.value;
  let preferredKind: CareOrgKind;
  if (hasProvider && hasPayer) {
    preferredKind = kindCookie === 'payer' ? 'payer' : 'provider';
  } else {
    preferredKind = hasPayer ? 'payer' : 'provider';
  }

  return {
    user,
    hasProvider,
    hasPayer,
    preferredKind,
    homePath: preferredKind === 'payer' ? '/payer/dashboard' : '/app/dashboard',
  };
}

export async function requireProviderSession(): Promise<ProviderSession> {
  const session = await getProviderSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requirePayerSession(): Promise<PayerSession> {
  const session = await getPayerSession();
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

export async function requirePayerWriteAccess(): Promise<PayerSession> {
  const session = await requirePayerSession();
  if (!canWriteOrg(session.activeRole)) {
    throw new Error('Forbidden');
  }
  return session;
}

export async function requirePayerManageAccess(): Promise<PayerSession> {
  const session = await requirePayerSession();
  if (!canManageOrg(session.activeRole)) {
    throw new Error('Forbidden');
  }
  return session;
}
