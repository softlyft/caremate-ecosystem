import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { planLabel, resolveUserEmail, sendTransactionalEmail } from '../_shared/email.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const RENEWAL_WINDOW_DAYS = 7;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Service-role / cron: email subscribers whose period ends within ~7 days.
 * Protect with Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> or CRON_SECRET.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const allowed =
      (serviceKey && token === serviceKey) || (cronSecret && token === cronSecret);
    if (!allowed) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const service = createServiceClient();
    const now = startOfUtcDay(new Date());
    const windowEnd = new Date(now);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + RENEWAL_WINDOW_DAYS);

    const { data: subscriptions, error } = await service
      .from('subscriptions')
      .select('id, user_id, plan_type, current_period_end')
      .in('status', ['active', 'trialing'])
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', windowEnd.toISOString());

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const dayKey = now.toISOString().slice(0, 10);
    let sent = 0;
    let skipped = 0;

    for (const sub of subscriptions ?? []) {
      const userId = sub.user_id as string;
      const subscriptionId = sub.id as string;
      const periodEndIso = sub.current_period_end as string;
      const to = await resolveUserEmail(service, userId);
      if (!to) {
        skipped += 1;
        continue;
      }

      const label = planLabel(sub.plan_type as string);
      const periodEnd = new Date(periodEndIso).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const result = await sendTransactionalEmail({
        service,
        to,
        userId,
        domain: 'billing',
        eventType: 'renewal_approaching',
        title: 'Renewal reminder',
        body: `Your CareMate ${label} subscription renews on ${periodEnd}.`,
        severity: 'info',
        dedupeKey: `billing:renewal:${subscriptionId}:${dayKey}`,
        template: 'billing-renewal',
        templateVars: { planLabel: label, periodEnd },
        entityType: 'subscriptions',
        entityId: subscriptionId,
      });

      if (result.deliveryStatus === 'sent') {
        sent += 1;
      } else {
        skipped += 1;
      }
    }

    return jsonResponse({
      ok: true,
      scanned: subscriptions?.length ?? 0,
      sent,
      skipped,
      window_end: windowEnd.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
