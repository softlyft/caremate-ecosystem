import { and, desc, eq, isNull, or } from 'drizzle-orm';
import * as WebBrowser from 'expo-web-browser';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { subscriptionEntitlements } from '@/database/schema';
import { familyRepository } from '@/domains/family/repository';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  type BillingCurrency,
  type BillingInterval,
  type PlanType,
  type PremiumState,
  type SubscriptionPriceRow,
} from '@/domains/billing/types';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { nowIso } from '@/utils/helpers';

function isActiveStatus(status: string): boolean {
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
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

    const active = rows.find((row) => isActiveStatus(row.status));
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error || !data) {
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
  }): Promise<{ url: string }> {
    const successUrl = 'caremate://billing/success';
    const cancelUrl = 'caremate://billing/cancel';

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        plan_type: input.planType,
        billing_interval: input.billingInterval,
        currency: input.currency,
        success_url: successUrl,
        cancel_url: cancelUrl,
        household_id: input.householdId ?? null,
      },
    });

    if (error) {
      throw error;
    }
    if (!data?.url) {
      throw new Error(data?.error ?? 'Checkout did not return a URL');
    }

    await WebBrowser.openBrowserAsync(data.url as string);
    return { url: data.url as string };
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

/** Entitlement helper — resolves tier from local cache (pull when online). */
export async function getPremiumState(userId: string): Promise<PremiumState> {
  try {
    await billingRepository.pullFromRemote();
  } catch {
    // Fall back to cache when offline / Edge Function unavailable.
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
