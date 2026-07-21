import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/domains/billing/types';

/**
 * Local entitlement gate used online and offline.
 * Status must be active/trialing and the paid period must not have ended.
 */
export function isLocalEntitlementActive(params: {
  status: string;
  currentPeriodEnd: string | null | undefined;
  now?: Date;
}): boolean {
  if (!(ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(params.status)) {
    return false;
  }

  const end = params.currentPeriodEnd?.trim();
  if (!end) {
    // Paid checkout always writes period end. Missing end = do not grant offline trust.
    return false;
  }

  const endMs = Date.parse(end);
  if (Number.isNaN(endMs)) {
    return false;
  }

  return endMs > (params.now ?? new Date()).getTime();
}
