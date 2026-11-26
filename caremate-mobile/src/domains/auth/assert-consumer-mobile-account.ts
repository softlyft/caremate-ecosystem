import { supabase } from '@/lib/supabase';

export const CARE_PORTAL_ONLY_MOBILE_MESSAGE =
  'This account is for the Care Portal, not the CareMate patient app.';

export const ADMIN_ONLY_MOBILE_MESSAGE =
  'This account is for SoftLyft admin, not the CareMate patient app.';

export type ConsumerMobileRejectReason = 'care_portal_only' | 'admin_only';

/** Thrown when an Auth user is not allowed to use the CareMate patient app. */
export class ConsumerMobileAccountError extends Error {
  readonly reason: ConsumerMobileRejectReason;

  constructor(reason: ConsumerMobileRejectReason) {
    super(reason === 'admin_only' ? ADMIN_ONLY_MOBILE_MESSAGE : CARE_PORTAL_ONLY_MOBILE_MESSAGE);
    this.name = 'ConsumerMobileAccountError';
    this.reason = reason;
  }
}

const SOFTLYFT_STAFF_ROLES = new Set(['admin', 'editor', 'support']);

export function isSoftLyftStaffRole(role: unknown): boolean {
  return typeof role === 'string' && SOFTLYFT_STAFF_ROLES.has(role);
}

export type ConsumerMobileAccountChecks = {
  hasActiveCarePortalMembership: (userId: string) => Promise<boolean>;
  hasApprovedPatientOrgConnection: (userId: string) => Promise<boolean>;
  signOutLocal: () => Promise<void>;
};

async function hasRows(
  result: PromiseLike<{ count: number | null; error: { message?: string } | null }>,
): Promise<boolean> {
  const { count, error } = await result;
  if (error) {
    throw error;
  }
  return (count ?? 0) > 0;
}

const defaultChecks: ConsumerMobileAccountChecks = {
  async hasActiveCarePortalMembership(userId) {
    if (
      await hasRows(
        supabase
          .from('provider_org_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('deleted_at', null),
      )
    ) {
      return true;
    }
    return hasRows(
      supabase
        .from('payer_org_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null),
    );
  },

  async hasApprovedPatientOrgConnection(userId) {
    if (
      await hasRows(
        supabase
          .from('patient_provider_connections')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', userId)
          .eq('status', 'approved'),
      )
    ) {
      return true;
    }
    return hasRows(
      supabase
        .from('patient_payer_connections')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', userId)
        .eq('status', 'approved'),
    );
  },

  async signOutLocal() {
    await supabase.auth.signOut({ scope: 'local' });
  },
};

/**
 * Reject Care Portal–only org staff and SoftLyft admin accounts from the patient app.
 * Mark-as-staff patients (org membership + approved patient↔org connection) are allowed.
 */
export async function assertConsumerMobileAccount(
  user: { id: string; app_metadata?: Record<string, unknown> | null },
  checks: ConsumerMobileAccountChecks = defaultChecks,
): Promise<void> {
  if (isSoftLyftStaffRole(user.app_metadata?.role)) {
    try {
      await checks.signOutLocal();
    } catch {
      // Still reject even if local sign-out fails.
    }
    throw new ConsumerMobileAccountError('admin_only');
  }

  const hasMembership = await checks.hasActiveCarePortalMembership(user.id);
  if (!hasMembership) {
    return;
  }

  const isElevatedPatient = await checks.hasApprovedPatientOrgConnection(user.id);
  if (isElevatedPatient) {
    return;
  }

  try {
    await checks.signOutLocal();
  } catch {
    // Still reject even if local sign-out fails.
  }
  throw new ConsumerMobileAccountError('care_portal_only');
}
