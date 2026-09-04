import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type SendPushNotificationInput = {
  service: SupabaseClient;
  userId: string;
  domain: string;
  eventType: string;
  title: string;
  body: string;
  severity?: 'info' | 'important' | 'critical';
  dedupeKey: string;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown>;
  /**
   * When false, still records a notification for push dedupe/delivery audit, but
   * marks it read and tags data.inbox=false so clients should not show it in the
   * bell inbox (e.g. messaging — Messages screen is the durable record).
   * Default true.
   */
  createInboxRow?: boolean;
};

export type SendPushNotificationResult = {
  notificationId: string;
  deliveryStatus: 'sent' | 'failed' | 'skipped' | 'already_sent';
  messageId?: string;
  error?: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Upsert cloud notification + push delivery row, then send via Expo Push API.
 * Idempotent on (user_id, dedupe_key) and skips if push delivery already sent.
 */
export async function sendExpoPushNotification(
  input: SendPushNotificationInput,
): Promise<SendPushNotificationResult> {
  const service = input.service;
  const severity = input.severity ?? 'info';
  const createInboxRow = input.createInboxRow !== false;
  const data = {
    ...(input.data ?? {}),
    ...(createInboxRow ? {} : { inbox: false }),
  };

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
        data,
        dedupe_key: input.dedupeKey,
        // Push-only: avoid unread badge on the bell inbox.
        ...(createInboxRow ? {} : { read_at: new Date().toISOString() }),
      })
      .select('id')
      .single();

    if (insertError) {
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
    .eq('channel', 'push')
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
        channel: 'push',
        status: 'pending',
        provider: 'expo',
        attempt_count: 0,
      })
      .select('id')
      .single();
    if (deliveryError) {
      throw new Error(deliveryError.message);
    }
    deliveryId = delivery!.id as string;
  }

  const { data: devices, error: devicesError } = await service
    .from('notification_devices')
    .select('expo_push_token')
    .eq('user_id', input.userId);

  if (devicesError) {
    throw new Error(devicesError.message);
  }

  const tokens = (devices ?? [])
    .map((row) => (typeof row.expo_push_token === 'string' ? row.expo_push_token.trim() : ''))
    .filter(Boolean);

  const attemptCount = (existingDelivery as { attempt_count?: number } | null)?.attempt_count ?? 0;
  const now = new Date().toISOString();

  if (tokens.length === 0) {
    await service
      .from('notification_deliveries')
      .update({
        status: 'skipped',
        provider: 'expo',
        error: 'No registered push devices',
        attempt_count: attemptCount + 1,
      })
      .eq('id', deliveryId);

    return {
      notificationId,
      deliveryStatus: 'skipped',
      error: 'No registered push devices',
    };
  }

  const messages = tokens.map((to) => ({
    to,
    title: input.title,
    body: input.body,
    sound: 'default' as const,
    data: {
      domain: input.domain,
      eventType: input.eventType,
      ...data,
    },
  }));

  const expoResult = await postExpoPush(messages);

  if (expoResult.ok) {
    await service
      .from('notification_deliveries')
      .update({
        status: 'sent',
        provider: 'expo',
        provider_message_id: expoResult.messageId ?? null,
        error: null,
        attempt_count: attemptCount + 1,
        sent_at: now,
      })
      .eq('id', deliveryId);

    return {
      notificationId,
      deliveryStatus: 'sent',
      messageId: expoResult.messageId,
    };
  }

  await service
    .from('notification_deliveries')
    .update({
      status: 'failed',
      provider: 'expo',
      error: expoResult.error,
      attempt_count: attemptCount + 1,
    })
    .eq('id', deliveryId);

  return {
    notificationId,
    deliveryStatus: 'failed',
    error: expoResult.error,
  };
}

async function postExpoPush(
  messages: Array<{
    to: string;
    title: string;
    body: string;
    sound: 'default';
    data: Record<string, unknown>;
  }>,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN')?.trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: ExpoPushTicket | ExpoPushTicket[]; errors?: unknown }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error: `Expo push HTTP ${response.status}`,
      };
    }

    const tickets = Array.isArray(payload?.data)
      ? payload.data
      : payload?.data
        ? [payload.data]
        : [];

    const okTickets = tickets.filter((t) => t.status === 'ok');
    const errorTickets = tickets.filter((t) => t.status === 'error');

    if (okTickets.length === 0) {
      const firstError = errorTickets[0];
      return {
        ok: false,
        error: firstError?.message ?? firstError?.details?.error ?? 'Expo push failed',
      };
    }

    return {
      ok: true,
      messageId: okTickets.map((t) => t.id).filter(Boolean).join(',') || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Expo push request failed',
    };
  }
}
