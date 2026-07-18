import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import {
  renderEmailTemplate,
  type EmailTemplateId,
} from './email-templates/index.ts';
import { sendViaSes } from './ses.ts';

export type SendTransactionalEmailInput = {
  service: SupabaseClient;
  to: string;
  userId: string;
  domain: string;
  eventType: string;
  title: string;
  body: string;
  severity?: 'info' | 'important' | 'critical';
  dedupeKey: string;
  template: EmailTemplateId;
  templateVars?: Record<string, string | null | undefined>;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown>;
};

export type SendTransactionalEmailResult = {
  notificationId: string;
  deliveryStatus: 'sent' | 'failed' | 'skipped' | 'already_sent';
  messageId?: string;
  error?: string;
};

/**
 * Upsert cloud notification + email delivery row, then send via Amazon SES.
 * Idempotent on (user_id, dedupe_key) and skips if email delivery already sent.
 */
export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return {
      notificationId: '',
      deliveryStatus: 'skipped',
      error: 'Missing or invalid recipient email',
    };
  }

  const service = input.service;
  const severity = input.severity ?? 'info';

  let notificationId: string | null = null;

  const { data: existing } = await service
    .from('notifications')
    .select('id')
    .eq('user_id', input.userId)
    .eq('dedupe_key', input.dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    notificationId = existing.id as string;
  } else {
    const { data: inserted, error: insertError } = await service
      .from('notifications')
      .insert({
        user_id: input.userId,
        domain: input.domain,
        event_type: input.eventType,
        title: input.title,
        body: input.body,
        severity,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        data: input.data ?? {},
        dedupe_key: input.dedupeKey,
      })
      .select('id')
      .single();

    if (insertError) {
      // Race on unique dedupe: fetch again
      const { data: raced } = await service
        .from('notifications')
        .select('id')
        .eq('user_id', input.userId)
        .eq('dedupe_key', input.dedupeKey)
        .maybeSingle();
      if (!raced?.id) {
        throw new Error(insertError.message);
      }
      notificationId = raced.id as string;
    } else {
      notificationId = inserted!.id as string;
    }
  }

  const { data: existingDelivery } = await service
    .from('notification_deliveries')
    .select('id, status, provider_message_id, attempt_count')
    .eq('notification_id', notificationId)
    .eq('channel', 'email')
    .maybeSingle();

  if (existingDelivery?.status === 'sent') {
    return {
      notificationId,
      deliveryStatus: 'already_sent',
      messageId: existingDelivery.provider_message_id ?? undefined,
    };
  }

  let deliveryId = existingDelivery?.id as string | undefined;
  if (!deliveryId) {
    const { data: delivery, error: deliveryError } = await service
      .from('notification_deliveries')
      .insert({
        notification_id: notificationId,
        channel: 'email',
        status: 'pending',
        provider: 'ses',
        attempt_count: 0,
      })
      .select('id')
      .single();
    if (deliveryError) {
      throw new Error(deliveryError.message);
    }
    deliveryId = delivery!.id as string;
  }

  const rendered = renderEmailTemplate(input.template, input.templateVars ?? {});
  const sesResult = await sendViaSes({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  const now = new Date().toISOString();
  const attemptCount = (existingDelivery as { attempt_count?: number } | null)?.attempt_count ?? 0;

  if (sesResult.ok) {
    await service
      .from('notification_deliveries')
      .update({
        status: 'sent',
        provider: 'ses',
        provider_message_id: sesResult.messageId,
        error: null,
        attempt_count: attemptCount + 1,
        sent_at: now,
      })
      .eq('id', deliveryId);

    return {
      notificationId,
      deliveryStatus: 'sent',
      messageId: sesResult.messageId,
    };
  }

  if (sesResult.skipped) {
    await service
      .from('notification_deliveries')
      .update({
        status: 'skipped',
        provider: 'ses',
        error: sesResult.reason,
        attempt_count: attemptCount + 1,
      })
      .eq('id', deliveryId);

    return {
      notificationId,
      deliveryStatus: 'skipped',
      error: sesResult.reason,
    };
  }

  await service
    .from('notification_deliveries')
    .update({
      status: 'failed',
      provider: 'ses',
      error: sesResult.error,
      attempt_count: attemptCount + 1,
    })
    .eq('id', deliveryId);

  return {
    notificationId,
    deliveryStatus: 'failed',
    error: sesResult.error,
  };
}

export function planLabel(planType: string | null | undefined): string {
  if (planType === 'family') return 'Family Premium';
  if (planType === 'personal') return 'Standard Premium';
  return 'Premium';
}

export async function resolveUserEmail(
  service: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await service
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();
  if (typeof profile?.email === 'string' && profile.email.includes('@')) {
    return profile.email.trim().toLowerCase();
  }

  const { data: authData, error } = await service.auth.admin.getUserById(userId);
  if (error || !authData?.user?.email) {
    return null;
  }
  return authData.user.email.trim().toLowerCase();
}

/** Best-effort billing activated email after a new finalize. */
export async function sendBillingActivatedEmail(
  service: SupabaseClient,
  params: {
    userId: string;
    paymentId: string;
    subscriptionId: string;
    planType: string;
    periodEnd?: string | null;
  },
): Promise<void> {
  try {
    const to = await resolveUserEmail(service, params.userId);
    if (!to) return;
    const label = planLabel(params.planType);
    const periodEnd = params.periodEnd
      ? new Date(params.periodEnd).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;
    await sendTransactionalEmail({
      service,
      to,
      userId: params.userId,
      domain: 'billing',
      eventType: 'subscription_activated',
      title: 'Subscription activated',
      body: `Your CareMate ${label} subscription is now active.`,
      severity: 'important',
      dedupeKey: `billing:activated:${params.paymentId}`,
      template: 'billing-activated',
      templateVars: { planLabel: label, periodEnd },
      entityType: 'subscriptions',
      entityId: params.subscriptionId,
    });
  } catch (err) {
    console.error('sendBillingActivatedEmail', err instanceof Error ? err.message : err);
  }
}

/** Best-effort payment failed email. */
export async function sendBillingPaymentFailedEmail(
  service: SupabaseClient,
  params: {
    userId: string;
    paymentId: string;
    planType?: string | null;
    reason?: string | null;
  },
): Promise<void> {
  try {
    const to = await resolveUserEmail(service, params.userId);
    if (!to) return;
    const label = planLabel(params.planType);
    await sendTransactionalEmail({
      service,
      to,
      userId: params.userId,
      domain: 'billing',
      eventType: 'payment_failed',
      title: 'Payment failed',
      body: `We could not process payment for your CareMate ${label} subscription.`,
      severity: 'critical',
      dedupeKey: `billing:failed:${params.paymentId}`,
      template: 'billing-payment-failed',
      templateVars: { planLabel: label, reason: params.reason },
      entityType: 'payments',
      entityId: params.paymentId,
    });
  } catch (err) {
    console.error('sendBillingPaymentFailedEmail', err instanceof Error ? err.message : err);
  }
}
