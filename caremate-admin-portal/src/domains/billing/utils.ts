/** Shared billing helpers for portal admin grants / upgrades. */

import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Resolve a household for Family billing: membership first, then owned household.
 * Owners may not appear in `family_members` yet.
 */
export async function resolveHouseholdIdForUser(
  admin: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data: membership, error: memberError } = await admin
    .from('family_members')
    .select('household_id')
    .eq('linked_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }
  if (membership?.household_id) {
    return membership.household_id;
  }

  const { data: owned, error: ownedError } = await admin
    .from('family_households')
    .select('id')
    .eq('created_by_user_id', userId)
    .limit(1)
    .maybeSingle();

  if (ownedError) {
    throw new Error(ownedError.message);
  }
  return owned?.id ?? null;
}

export function periodEndIso(interval: string, from = new Date()): string {
  const d = new Date(from);
  if (interval === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export function normalizePatientId(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

export function isValidPatientId(raw: string): boolean {
  return /^\d{12}$/.test(normalizePatientId(raw));
}

/** True when a subscription row is still within its paid period (or has no end date). */
export function isSubscriptionPeriodActive(
  currentPeriodEnd: string | null | undefined,
  now = new Date(),
): boolean {
  if (!currentPeriodEnd) {
    return true;
  }
  return new Date(currentPeriodEnd).getTime() > now.getTime();
}

const MS_PER_DAY = 86_400_000;

export type UpgradeQuoteInput = {
  fromSubscriptionId: string;
  personalPeriodStart: string;
  personalPeriodEnd: string;
  personalPaidMinor: number;
  familyListPriceMinor: number;
  familyPriceId: string;
  billingInterval: 'monthly' | 'yearly';
  currency: 'NGN' | 'USD';
  householdId: string;
  provider: 'paystack' | 'stripe';
  now?: Date;
};

/** Prorated Standard → Family upgrade quote (mirrors edge `computeUpgradeQuote`). */
export function computeUpgradeQuote(params: UpgradeQuoteInput) {
  const now = params.now ?? new Date();
  const startMs = Date.parse(params.personalPeriodStart);
  const endMs = Date.parse(params.personalPeriodEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error('Invalid personal subscription period');
  }

  const daysTotal = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const daysRemaining = Math.max(0, Math.round((endMs - now.getTime()) / MS_PER_DAY));
  const creditMinor = Math.floor((params.personalPaidMinor * daysRemaining) / daysTotal);
  const chargeMinor = Math.max(0, params.familyListPriceMinor - creditMinor);

  return {
    fromSubscriptionId: params.fromSubscriptionId,
    daysTotal,
    daysRemaining,
    personalPaidMinor: params.personalPaidMinor,
    creditMinor,
    familyListPriceMinor: params.familyListPriceMinor,
    chargeMinor,
    currency: params.currency,
    billingInterval: params.billingInterval,
    householdId: params.householdId,
    newPeriodStart: now.toISOString(),
    newPeriodEnd: periodEndIso(params.billingInterval, now),
    provider: params.provider,
    familyPriceId: params.familyPriceId,
  };
}
