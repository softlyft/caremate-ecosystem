'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import {
  getPayerOrgPlanActivationContext,
  type PayerOrgPlanActivationContext,
} from '@/domains/payer-plans/repository';
import type { OrgPlanActivationLookup } from '@/features/plans/org-plan-activation-types';

async function requireBillingAdmin() {
  const session = await requirePortalSession();
  if (!canManageBilling(session.role)) throw new Error('Forbidden');
  return session;
}

function toActivationLookup(ctx: PayerOrgPlanActivationContext): OrgPlanActivationLookup {
  return {
    found: ctx.found,
    organizationId: ctx.organizationId,
    organizationName: ctx.organizationName,
    claimed: ctx.claimed,
    activePlanTier: ctx.activeSubscription?.plan_tier ?? null,
    activePlanProvider: ctx.activeSubscription?.provider ?? null,
    activePeriodEnd: ctx.activeSubscription?.current_period_end ?? null,
  };
}

export async function lookupPayerOrgPlanActivation(
  organizationId: string,
): Promise<OrgPlanActivationLookup> {
  await requireBillingAdmin();
  const ctx = await getPayerOrgPlanActivationContext(organizationId);
  return toActivationLookup(ctx);
}

export async function updatePayerOrgPlanPrice(input: {
  id: string;
  amount_minor: number;
  support_team_seat_limit: number;
  patient_connection_cap: number;
  provider_connection_cap: number;
  voice_minutes_included: number;
  group_chat_enabled?: boolean;
  is_active?: boolean;
  paystack_plan_code?: string | null;
}) {
  await requireBillingAdmin();
  if (!Number.isFinite(input.amount_minor) || input.amount_minor < 0) {
    throw new Error('Invalid amount');
  }
  if (!Number.isFinite(input.support_team_seat_limit) || input.support_team_seat_limit < 1) {
    throw new Error('Invalid seat limit');
  }
  if (!Number.isFinite(input.patient_connection_cap) || input.patient_connection_cap < 1) {
    throw new Error('Invalid patient cap');
  }
  if (!Number.isFinite(input.provider_connection_cap) || input.provider_connection_cap < 1) {
    throw new Error('Invalid provider connection cap');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('payer_org_plan_prices')
    .update({
      amount_minor: Math.round(input.amount_minor),
      support_team_seat_limit: Math.round(input.support_team_seat_limit),
      patient_connection_cap: Math.round(input.patient_connection_cap),
      provider_connection_cap: Math.round(input.provider_connection_cap),
      voice_minutes_included: Math.max(0, Math.round(input.voice_minutes_included)),
      group_chat_enabled: input.group_chat_enabled ?? false,
      is_active: input.is_active ?? true,
      paystack_plan_code: input.paystack_plan_code ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) throw error;

  await writeAuditEvent({
    action: 'payer_org_plan_price.update' as never,
    entityType: 'payer_org_plan_prices',
    entityId: input.id,
    payload: {
      amount_minor: input.amount_minor,
      support_team_seat_limit: input.support_team_seat_limit,
      patient_connection_cap: input.patient_connection_cap,
      provider_connection_cap: input.provider_connection_cap,
    },
  });

  revalidatePath('/dashboard/payer-plans');
}

export async function grantPayerOrgSubscription(input: {
  organizationId: string;
  planTier: 'basic' | 'pro' | 'enterprise';
  billingInterval?: 'monthly' | 'yearly';
  periodMonths?: number;
  supportTeamSeatLimit?: number | null;
  patientConnectionCap?: number | null;
  providerConnectionCap?: number | null;
}) {
  await requireBillingAdmin();
  const orgId = input.organizationId.trim();
  if (!orgId) throw new Error('Organization ID is required');

  const activation = await getPayerOrgPlanActivationContext(orgId);
  if (!activation.found) throw new Error('Payer organization not found');
  if (!activation.claimed) {
    throw new Error('Organization must be claimed before a plan can be activated');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_grant_payer_org_subscription', {
    p_organization_id: orgId,
    p_plan_tier: input.planTier,
    p_billing_interval: input.billingInterval ?? 'yearly',
    p_support_team_seat_limit: input.supportTeamSeatLimit ?? undefined,
    p_patient_connection_cap: input.patientConnectionCap ?? undefined,
    p_provider_connection_cap: input.providerConnectionCap ?? undefined,
    p_period_months: input.periodMonths ?? 12,
  });

  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as { id?: string } | null;

  await writeAuditEvent({
    action: 'payer_org_subscription.grant' as never,
    entityType: 'payer_org_subscriptions',
    entityId: row?.id ?? orgId,
    payload: {
      organization_id: orgId,
      plan_tier: input.planTier,
    },
  });

  revalidatePath('/dashboard/payer-plans');
  revalidatePath('/dashboard/payer-plans/grants');
  revalidatePath(`/dashboard/payers/${orgId}`);
}
