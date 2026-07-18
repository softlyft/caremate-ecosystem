import { and, desc, eq, isNull, or } from 'drizzle-orm';
import * as WebBrowser from 'expo-web-browser';

import { config } from '@/constants/env';
import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { subscriptionEntitlements } from '@/database/schema';
import { familyRepository } from '@/domains/family/repository';
import { isLocalEntitlementActive } from '@/domains/billing/period';
import {
  type BillingCurrency,
  type BillingInterval,
  type PlanType,
  type PremiumState,
  type SubscriptionPriceRow,
} from '@/domains/billing/types';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { isOnline } from '@/sync/network';
import { nowIso } from '@/utils/helpers';

export type FamilyUpgradeQuote = {
  fromSubscriptionId: string;
  daysTotal: number;
  daysRemaining: number;
  personalPaidMinor: number;
  creditMinor: number;
  familyListPriceMinor: number;
  chargeMinor: number;
  currency: BillingCurrency;
  billingInterval: BillingInterval;
  householdId: string;
  newPeriodStart: string;
  newPeriodEnd: string;
  provider: 'paystack' | 'stripe';
};

function mapUpgradeQuote(raw: Record<string, unknown>): FamilyUpgradeQuote {
  return {
    fromSubscriptionId: String(raw.fromSubscriptionId ?? raw.from_subscription_id ?? ''),
    daysTotal: Number(raw.daysTotal ?? raw.days_total ?? 0),
    daysRemaining: Number(raw.daysRemaining ?? raw.days_remaining ?? 0),
    personalPaidMinor: Number(raw.personalPaidMinor ?? raw.personal_paid_minor ?? 0),
    creditMinor: Number(raw.creditMinor ?? raw.credit_minor ?? 0),
    familyListPriceMinor: Number(raw.familyListPriceMinor ?? raw.family_list_price_minor ?? 0),
    chargeMinor: Number(raw.chargeMinor ?? raw.charge_minor ?? 0),
    currency: String(raw.currency ?? 'NGN') as BillingCurrency,
    billingInterval: String(raw.billingInterval ?? raw.billing_interval ?? 'monthly') as BillingInterval,
    householdId: String(raw.householdId ?? raw.household_id ?? ''),
    newPeriodStart: String(raw.newPeriodStart ?? raw.new_period_start ?? ''),
    newPeriodEnd: String(raw.newPeriodEnd ?? raw.new_period_end ?? ''),
    provider: String(raw.provider ?? 'paystack') as 'paystack' | 'stripe',
  };
}

function mapPrice(row: {
  id: string;
  plan_type: string;
  billing_interval: string;
  currency: string;
  amount_minor: number;
  provider: string;
  is_active: boolean;
}): SubscriptionPriceRow {
  return {
    id: row.id,
    planType: row.plan_type as PlanType,
    billingInterval: row.billing_interval as BillingInterval,
    currency: row.currency as BillingCurrency,
    amountMinor: row.amount_minor,
    provider: row.provider as SubscriptionPriceRow['provider'],
    isActive: row.is_active,
  };
}

class BillingRepository extends BaseRepository {
  async listPrices(): Promise<SubscriptionPriceRow[]> {
    const { data, error } = await supabase
      .from('subscription_prices')
      .select('*')
      .eq('is_active', true)
      .order('plan_type')
      .order('billing_interval')
      .order('currency');

    if (error || !data) {
      return [];
    }
    return data.map(mapPrice);
  }

  async getCachedPremiumState(userId: string): Promise<PremiumState> {
    if (!userId || userId === GUEST_USER_ID) {
      return emptyPremiumState();
    }

    const db = getDatabase();
    const household = await familyRepository.findHouseholdForUser(userId);
    const conditions = [
      and(eq(subscriptionEntitlements.userId, userId), isNull(subscriptionEntitlements.deletedAt)),
    ];
    if (household) {
      conditions.push(
        and(
          eq(subscriptionEntitlements.householdId, household.id),
          eq(subscriptionEntitlements.planType, 'family'),
          isNull(subscriptionEntitlements.deletedAt),
        ),
      );
    }

    const rows = await db
      .select()
      .from(subscriptionEntitlements)
      .where(or(...conditions))
      .orderBy(desc(subscriptionEntitlements.updatedAt));

    const active = rows.find((row) =>
      isLocalEntitlementActive({
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
      }),
    );
    if (!active) {
      return emptyPremiumState();
    }

    return {
      tier: active.planType === 'family' ? 'family' : 'personal',
      status: active.status,
      planType: active.planType as PlanType,
      billingInterval: active.billingInterval as BillingInterval,
      currency: active.currency as BillingCurrency,
      provider: active.provider as PremiumState['provider'],
      householdId: active.householdId,
      currentPeriodEnd: active.currentPeriodEnd,
      subscriptionId: active.id,
    };
  }

  async pullFromRemote(): Promise<void> {
    // Never attempt a wipe/replace while offline — local period end is the source of truth.
    if (!(await isOnline())) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const { data, error } = await supabase.from('subscriptions').select('*');
    // Preserve SQLite cache on any transport / RLS failure.
    if (error || data == null) {
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();

    // Full replace of local entitlement cache (pull-only mirror).
    await db.delete(subscriptionEntitlements);

    for (const row of data) {
      await db.insert(subscriptionEntitlements).values({
        id: row.id,
        userId: row.user_id,
        householdId: row.household_id,
        planType: row.plan_type,
        billingInterval: row.billing_interval,
        currency: row.currency,
        provider: row.provider,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        syncStatus: 'synced',
        deletedAt: null,
        createdAt: row.created_at ?? timestamp,
        updatedAt: row.updated_at ?? timestamp,
      });
    }
  }

  async startCheckout(input: {
    planType: PlanType;
    billingInterval: BillingInterval;
    currency: BillingCurrency;
    householdId?: string | null;
    patientId?: string | null;
  }): Promise<{ url: string }> {
    const paymentBase = config.paymentUrl.replace(/\/$/, '');
    if (!paymentBase) {
      throw new Error('Payment URL is not configured (EXPO_PUBLIC_PAYMENT_URL)');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !session.refresh_token) {
      throw new Error('Sign in to continue to payment');
    }

    const query = new URLSearchParams({
      plan_type: input.planType,
      billing_interval: input.billingInterval,
      currency: input.currency,
      return_success: 'caremate://billing/success',
      return_cancel: 'caremate://billing/cancel',
    });
    if (input.householdId) {
      query.set('household_id', input.householdId);
    }
    if (input.patientId) {
      query.set('patient_id', input.patientId);
    }

    const hash = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    const url = `${paymentBase}/?${query.toString()}#${hash.toString()}`;
    await WebBrowser.openBrowserAsync(url);
    return { url };
  }

  async quoteFamilyUpgrade(input: {
    billingInterval: BillingInterval;
    currency: BillingCurrency;
    householdId?: string | null;
  }): Promise<FamilyUpgradeQuote> {
    const { data, error } = await supabase.functions.invoke('quote-upgrade', {
      body: {
        billing_interval: input.billingInterval,
        currency: input.currency,
        household_id: input.householdId ?? null,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    if (!data?.quote) throw new Error('Upgrade quote unavailable');
    return mapUpgradeQuote(data.quote);
  }

  async startFamilyUpgrade(input: {
    billingInterval: BillingInterval;
    currency: BillingCurrency;
    householdId?: string | null;
  }): Promise<{ activated: boolean; url: string | null; quote: FamilyUpgradeQuote }> {
    const successUrl = config.paymentUrl
      ? `${config.paymentUrl.replace(/\/$/, '')}/success?return=${encodeURIComponent('caremate://billing/success')}`
      : 'caremate://billing/success';
    const cancelUrl = config.paymentUrl
      ? `${config.paymentUrl.replace(/\/$/, '')}/cancel?return=${encodeURIComponent('caremate://billing/cancel')}`
      : 'caremate://billing/cancel';

    const { data, error } = await supabase.functions.invoke('create-upgrade', {
      body: {
        billing_interval: input.billingInterval,
        currency: input.currency,
        household_id: input.householdId ?? null,
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));

    const quote = data?.quote ? mapUpgradeQuote(data.quote) : null;
    if (!quote) throw new Error('Upgrade did not return a quote');

    if (data.activated) {
      await this.pullFromRemote();
      return { activated: true, url: null, quote };
    }

    if (!data?.url) {
      throw new Error('Upgrade did not return a payment URL');
    }

    await WebBrowser.openBrowserAsync(data.url as string);
    return { activated: false, url: data.url as string, quote };
  }

  async verifyCheckout(input: {
    reference?: string | null;
    paymentId?: string | null;
  } = {}): Promise<{ status: string; subscriptionId?: string }> {
    const body: Record<string, string> = {};
    if (input.paymentId) body.payment_id = input.paymentId;
    if (input.reference) body.reference = input.reference;
    // Empty body is allowed — Edge Function uses the latest pending payment for this user.

    const { data, error } = await supabase.functions.invoke('verify-checkout', { body });
    if (error) {
      throw error;
    }
    if (data?.error) {
      throw new Error(String(data.error));
    }

    return {
      status: String(data?.status ?? 'unknown'),
      subscriptionId: data?.subscription_id ? String(data.subscription_id) : undefined,
    };
  }

  /** Confirm provider charge, pull entitlements, ready for UI refresh. */
  async syncAfterCheckout(input: {
    reference?: string | null;
    paymentId?: string | null;
  } = {}): Promise<PremiumState> {
    try {
      await this.verifyCheckout(input);
    } catch {
      // Webhook may have already finalized; still pull.
    }
    await this.pullFromRemote();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return emptyPremiumState();
    }
    return this.getCachedPremiumState(user.id);
  }
}

export function emptyPremiumState(): PremiumState {
  return {
    tier: 'free',
    status: null,
    planType: null,
    billingInterval: null,
    currency: null,
    provider: null,
    householdId: null,
    currentPeriodEnd: null,
    subscriptionId: null,
  };
}

export const billingRepository = new BillingRepository();

/** Entitlement helper — local SQLite is authoritative offline; pull only when online. */
export async function getPremiumState(userId: string): Promise<PremiumState> {
  try {
    if (await isOnline()) {
      await billingRepository.pullFromRemote();
    }
  } catch {
    // Fall back to cache when offline / request fails.
  }
  return billingRepository.getCachedPremiumState(userId);
}

export function premiumLabel(tier: PremiumState['tier']): string {
  if (tier === 'personal') return 'Standard Premium';
  if (tier === 'family') return 'Family Premium';
  return 'Free';
}

export function formatPriceAmount(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}
