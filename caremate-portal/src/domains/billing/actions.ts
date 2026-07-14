'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
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
