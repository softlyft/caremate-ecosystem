'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalSession } from '@/lib/auth';
import { canManageBilling } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';

async function requireBillingAdmin() {
  const session = await requirePortalSession();
  if (!canManageBilling(session.role)) throw new Error('Forbidden');
  return session;
}

export async function updateSubscriptionPrice(input: {
  id: string;
  amount_minor: number;
  is_active?: boolean;
  stripe_price_id?: string | null;
  paystack_plan_code?: string | null;
}) {
  await requireBillingAdmin();
  if (!Number.isFinite(input.amount_minor) || input.amount_minor < 0) {
    throw new Error('Invalid amount');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('subscription_prices')
    .update({
      amount_minor: Math.round(input.amount_minor),
      is_active: input.is_active ?? true,
      stripe_price_id: input.stripe_price_id ?? null,
      paystack_plan_code: input.paystack_plan_code ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) throw error;

  await writeAuditEvent({
    action: 'update_subscription_price',
    entityType: 'subscription_price',
    entityId: input.id,
    payload: {
      amount_minor: input.amount_minor,
      is_active: input.is_active ?? true,
    },
  });

  revalidatePath('/dashboard/billing');
}

function periodEndIso(interval: string, from = new Date()): string {
  const d = new Date(from);
  if (interval === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

function normalizePatientId(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

/**
 * Grant Premium from the portal without a payment gateway charge.
 * Creates/renews an active subscription with provider = admin (no payments row).
 */
export async function createAdminSubscription(input: {
  patientId: string;
  priceId: string;
}): Promise<{ subscriptionId: string }> {
  const session = await requireBillingAdmin();
  const patientId = normalizePatientId(input.patientId);
  if (!/^\d{12}$/.test(patientId)) {
    throw new Error('Patient ID must be exactly 12 digits');
  }
  if (!input.priceId?.trim()) {
    throw new Error('Select a plan');
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, patient_id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.user_id) {
    throw new Error('No user found for that Patient ID');
  }

  const { data: price, error: priceError } = await admin
    .from('subscription_prices')
    .select('*')
    .eq('id', input.priceId)
    .eq('is_active', true)
    .maybeSingle();

  if (priceError) throw new Error(priceError.message);
  if (!price) {
    throw new Error('Selected plan is not available');
  }

  let householdId: string | null = null;
  if (price.plan_type === 'family') {
    const { data: membership } = await admin
      .from('family_members')
      .select('household_id')
      .eq('linked_user_id', profile.user_id)
      .limit(1)
      .maybeSingle();
    householdId = membership?.household_id ?? null;
    if (!householdId) {
      throw new Error(
        'Family plan requires a household. Have the user set up family profiles in the app first.',
      );
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const periodEnd = periodEndIso(price.billing_interval, now);

  const { data: existingRows, error: existingError } = await admin
    .from('subscriptions')
    .select('id, plan_type, status, current_period_end')
    .eq('user_id', profile.user_id)
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(10);

  if (existingError) throw new Error(existingError.message);

  const activeExisting = (existingRows ?? []).find((row) => {
    if (!row.current_period_end) return true;
    return new Date(row.current_period_end).getTime() > now.getTime();
  });

  if (activeExisting) {
    const ends = activeExisting.current_period_end
      ? new Date(activeExisting.current_period_end).toLocaleDateString()
      : 'unknown';
    throw new Error(
      `This user already has an active ${activeExisting.plan_type} subscription (until ${ends}). Cancel or wait for it to end before creating another.`,
    );
  }

  const subscriptionId = crypto.randomUUID();
  const { error: insertError } = await admin.from('subscriptions').insert({
    id: subscriptionId,
    user_id: profile.user_id,
    household_id: householdId,
    plan_type: price.plan_type,
    billing_interval: price.billing_interval,
    currency: price.currency,
    provider: 'admin',
    status: 'active',
    payment_id: null,
    provider_ref: 'admin_activated',
    current_period_start: nowIso,
    current_period_end: periodEnd,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertError) throw new Error(insertError.message);

  await writeAuditEvent({
    action: 'admin_activate_subscription',
    entityType: 'subscription',
    entityId: subscriptionId,
    payload: {
      patient_id: patientId,
      user_id: profile.user_id,
      price_id: price.id,
      plan_type: price.plan_type,
      billing_interval: price.billing_interval,
      currency: price.currency,
      actor_email: session.user.email ?? null,
      note: 'admin_activated',
    },
  });

  revalidatePath('/dashboard/billing/subscribers');
  revalidatePath('/dashboard/billing/transactions');
  return { subscriptionId };
}

/**
 * Admin Standard → Family upgrade: cancel active personal, grant Family from today
 * (full new period, no payment). Requires an existing household.
 */
export async function adminUpgradeToFamily(input: {
  patientId: string;
  priceId: string;
}): Promise<{ subscriptionId: string }> {
  const session = await requireBillingAdmin();
  const patientId = normalizePatientId(input.patientId);
  if (!/^\d{12}$/.test(patientId)) {
    throw new Error('Patient ID must be exactly 12 digits');
  }
  if (!input.priceId?.trim()) {
    throw new Error('Select a Family plan');
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, patient_id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.user_id) {
    throw new Error('No user found for that Patient ID');
  }

  const { data: price, error: priceError } = await admin
    .from('subscription_prices')
    .select('*')
    .eq('id', input.priceId)
    .eq('plan_type', 'family')
    .eq('is_active', true)
    .maybeSingle();

  if (priceError) throw new Error(priceError.message);
  if (!price) {
    throw new Error('Selected Family plan is not available');
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const { data: personalRows, error: personalError } = await admin
    .from('subscriptions')
    .select('id, plan_type, status, current_period_end')
    .eq('user_id', profile.user_id)
    .eq('plan_type', 'personal')
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(5);

  if (personalError) throw new Error(personalError.message);

  const personal = (personalRows ?? []).find((row) => {
    if (!row.current_period_end) return true;
    return new Date(row.current_period_end).getTime() > now.getTime();
  });

  if (!personal) {
    throw new Error(
      'No active Standard subscription to upgrade. Use Add a subscriber for new grants.',
    );
  }

  const { data: familyExisting } = await admin
    .from('subscriptions')
    .select('id, current_period_end')
    .eq('user_id', profile.user_id)
    .eq('plan_type', 'family')
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (
    familyExisting &&
    (!familyExisting.current_period_end ||
      new Date(familyExisting.current_period_end).getTime() > now.getTime())
  ) {
    throw new Error('This user already has an active Family subscription');
  }

  const { data: membership } = await admin
    .from('family_members')
    .select('household_id')
    .eq('linked_user_id', profile.user_id)
    .limit(1)
    .maybeSingle();

  const householdId = membership?.household_id ?? null;
  if (!householdId) {
    throw new Error(
      'Family plan requires a household. Have the user set up family profiles in the app first.',
    );
  }

  const periodEnd = periodEndIso(price.billing_interval, now);
  const subscriptionId = crypto.randomUUID();

  const { error: cancelError } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: nowIso,
      provider_ref: `admin_upgraded_to_family:${subscriptionId}`,
    })
    .eq('user_id', profile.user_id)
    .eq('plan_type', 'personal')
    .in('status', ['active', 'trialing', 'past_due']);

  if (cancelError) throw new Error(cancelError.message);

  const { error: insertError } = await admin.from('subscriptions').insert({
    id: subscriptionId,
    user_id: profile.user_id,
    household_id: householdId,
    plan_type: 'family',
    billing_interval: price.billing_interval,
    currency: price.currency,
    provider: 'admin',
    status: 'active',
    payment_id: null,
    provider_ref: 'admin_upgraded_to_family',
    current_period_start: nowIso,
    current_period_end: periodEnd,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertError) throw new Error(insertError.message);

  await writeAuditEvent({
    action: 'admin_upgrade_to_family',
    entityType: 'subscription',
    entityId: subscriptionId,
    payload: {
      patient_id: patientId,
      user_id: profile.user_id,
      from_subscription_id: personal.id,
      price_id: price.id,
      billing_interval: price.billing_interval,
      currency: price.currency,
      actor_email: session.user.email ?? null,
      note: 'admin_upgraded_to_family',
    },
  });

  revalidatePath('/dashboard/billing/subscribers');
  revalidatePath('/dashboard/billing/transactions');
  return { subscriptionId };
}
