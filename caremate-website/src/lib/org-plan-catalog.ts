import { isSupabaseConfigured, supabaseRestHeaders, supabaseRestUrl } from '@/lib/supabase';
import {
  PROVIDER_PLAN_SHELLS,
  type ProviderPlan,
  type ProviderPlanId,
} from '@/lib/provider-pricing';
import {
  PAYER_PLAN_SHELLS,
  type PayerPlan,
  type PayerPlanId,
} from '@/lib/payer-pricing';

export type BillingInterval = 'monthly' | 'yearly';

export type ProviderCatalogRow = {
  plan_tier: 'basic' | 'pro';
  billing_interval: BillingInterval;
  amount_minor: number;
};

export type PayerCatalogRow = {
  plan_tier: 'basic' | 'pro';
  billing_interval: BillingInterval;
  amount_minor: number;
};

type CatalogByTier<T> = Partial<Record<'basic' | 'pro', Partial<Record<BillingInterval, T>>>>;

export function formatNgnFromMinor(amountMinor: number): string {
  const naira = amountMinor / 100;
  return `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function indexProviderCatalog(rows: ProviderCatalogRow[]): CatalogByTier<ProviderCatalogRow> {
  const map: CatalogByTier<ProviderCatalogRow> = {};
  for (const row of rows) {
    map[row.plan_tier] ??= {};
    map[row.plan_tier]![row.billing_interval] = row;
  }
  return map;
}

function indexPayerCatalog(rows: PayerCatalogRow[]): CatalogByTier<PayerCatalogRow> {
  const map: CatalogByTier<PayerCatalogRow> = {};
  for (const row of rows) {
    map[row.plan_tier] ??= {};
    map[row.plan_tier]![row.billing_interval] = row;
  }
  return map;
}

export function buildProviderPlans(catalog: CatalogByTier<ProviderCatalogRow>): ProviderPlan[] {
  return PROVIDER_PLAN_SHELLS.map((shell) => {
    if (shell.id === 'free' || shell.id === 'enterprise') {
      return { ...shell };
    }

    const tier = shell.id as 'basic' | 'pro';
    const monthly = catalog[tier]?.monthly;
    const yearly = catalog[tier]?.yearly;

    return {
      ...shell,
      monthlyDisplay: monthly ? formatNgnFromMinor(monthly.amount_minor) : shell.monthlyDisplay,
      yearlyDisplay: yearly ? formatNgnFromMinor(yearly.amount_minor) : shell.yearlyDisplay,
    };
  });
}

export function buildPayerPlans(catalog: CatalogByTier<PayerCatalogRow>): PayerPlan[] {
  return PAYER_PLAN_SHELLS.map((shell) => {
    if (shell.id === 'free' || shell.id === 'enterprise') {
      return { ...shell };
    }

    const tier = shell.id as 'basic' | 'pro';
    const monthly = catalog[tier]?.monthly;
    const yearly = catalog[tier]?.yearly;

    return {
      ...shell,
      monthlyDisplay: monthly ? formatNgnFromMinor(monthly.amount_minor) : shell.monthlyDisplay,
      yearlyDisplay: yearly ? formatNgnFromMinor(yearly.amount_minor) : shell.yearlyDisplay,
    };
  });
}

async function fetchCatalogRows<T>(table: string, select: string): Promise<T[]> {
  const url = supabaseRestUrl(
    table,
    `is_active=eq.true&select=${encodeURIComponent(select)}&order=plan_tier,billing_interval`,
  );
  const response = await fetch(url, { headers: supabaseRestHeaders() });
  if (!response.ok) {
    throw new Error(`Catalog fetch failed (${response.status})`);
  }
  return (await response.json()) as T[];
}

export async function fetchProviderOrgPlanCatalog(): Promise<ProviderPlan[]> {
  if (!isSupabaseConfigured) {
    return buildProviderPlans({});
  }
  const rows = await fetchCatalogRows<ProviderCatalogRow>(
    'provider_org_plan_prices',
    'plan_tier,billing_interval,amount_minor',
  );
  return buildProviderPlans(indexProviderCatalog(rows));
}

export async function fetchPayerOrgPlanCatalog(): Promise<PayerPlan[]> {
  if (!isSupabaseConfigured) {
    return buildPayerPlans({});
  }
  const rows = await fetchCatalogRows<PayerCatalogRow>(
    'payer_org_plan_prices',
    'plan_tier,billing_interval,amount_minor',
  );
  return buildPayerPlans(indexPayerCatalog(rows));
}

export type OrgPlanCatalogKind = 'provider' | 'payer';

export type OrgPlanCatalogState =
  | { status: 'loading'; plans: ProviderPlan[] | PayerPlan[] }
  | { status: 'ready'; plans: ProviderPlan[] | PayerPlan[]; source: 'catalog' | 'fallback' }
  | { status: 'error'; plans: ProviderPlan[] | PayerPlan[]; message: string };

export function initialOrgPlanCatalogState(kind: OrgPlanCatalogKind): OrgPlanCatalogState {
  return {
    status: 'loading',
    plans: kind === 'provider' ? buildProviderPlans({}) : buildPayerPlans({}),
  };
}

export async function loadOrgPlanCatalog(
  kind: OrgPlanCatalogKind,
): Promise<OrgPlanCatalogState> {
  const fallback =
    kind === 'provider' ? buildProviderPlans({}) : buildPayerPlans({});

  if (!isSupabaseConfigured) {
    return { status: 'ready', plans: fallback, source: 'fallback' };
  }

  try {
    const plans =
      kind === 'provider'
        ? await fetchProviderOrgPlanCatalog()
        : await fetchPayerOrgPlanCatalog();
    return { status: 'ready', plans, source: 'catalog' };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load catalog prices';
    return { status: 'error', plans: fallback, message };
  }
}

export type { ProviderPlanId, PayerPlanId };
