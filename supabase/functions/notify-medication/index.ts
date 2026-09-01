import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type MedicationAlertBody = {
  eventType: 'dose_due' | 'dose_missed' | 'refill_due';
  dedupeKey: string;
  title: string;
  body: string;
  severity?: 'info' | 'important' | 'critical';
  entityId: string;
};

type NotifyBody = {
  alerts?: MedicationAlertBody[];
};

/**
 * Signed-in patient medication reminders (in-app cloud row + Expo push).
 * Body: { alerts: [{ eventType, dedupeKey, title, body, severity?, entityId }] }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as NotifyBody;
    const alerts = (body.alerts ?? []).filter(
      (alert) =>
        alert &&
        typeof alert.dedupeKey === 'string' &&
        alert.dedupeKey.trim() &&
        typeof alert.title === 'string' &&
        typeof alert.body === 'string' &&
        typeof alert.entityId === 'string',
    );

    if (alerts.length === 0) {
      return jsonResponse({ error: 'alerts are required' }, 400);
    }

    const service = createServiceClient();
    const results: Array<{ dedupeKey: string; status: string }> = [];

    for (const alert of alerts) {
      const eventType = alert.eventType ?? 'dose_due';
      if (!['dose_due', 'dose_missed', 'refill_due'].includes(eventType)) {
        results.push({ dedupeKey: alert.dedupeKey, status: 'skipped_invalid_event' });
        continue;
      }

      try {
        const sent = await sendExpoPushNotification({
          service,
          userId: user.id,
          domain: 'medication',
          eventType,
          title: alert.title.trim(),
          body: alert.body.trim(),
          severity: alert.severity ?? (eventType === 'dose_missed' ? 'critical' : 'important'),
          dedupeKey: alert.dedupeKey.trim(),
          entityType: 'medication',
          entityId: alert.entityId,
          data: {
            medicationId: alert.entityId,
            path: '/(app)/apps/medication-tracker',
          },
        });
        results.push({ dedupeKey: alert.dedupeKey, status: sent.deliveryStatus });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'push failed';
        console.error('notify-medication push', alert.dedupeKey, message);
        results.push({ dedupeKey: alert.dedupeKey, status: 'failed' });
      }
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-medication', message);
    return jsonResponse({ error: message }, 500);
  }
});
