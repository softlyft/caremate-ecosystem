import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendBillingActivatedEmail } from '../_shared/email.ts';
import { createServiceClient } from '../_shared/supabase.ts';

/**
 * Service-role: send billing-activated email (portal admin grants).
 * Body: { userId, subscriptionId, planType, periodEnd?, paymentId? }
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
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!serviceKey || token !== serviceKey) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as {
      userId?: string;
      subscriptionId?: string;
      planType?: string;
      periodEnd?: string | null;
      paymentId?: string | null;
    };

    if (!body.userId?.trim() || !body.subscriptionId?.trim()) {
      return jsonResponse({ error: 'userId and subscriptionId are required' }, 400);
    }

    const service = createServiceClient();
    const paymentId = body.paymentId?.trim() || `admin:${body.subscriptionId}`;

    await sendBillingActivatedEmail(service, {
      userId: body.userId.trim(),
      paymentId,
      subscriptionId: body.subscriptionId.trim(),
      planType: body.planType ?? 'personal',
      periodEnd: body.periodEnd ?? null,
    });

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
