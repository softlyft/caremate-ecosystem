import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';
import { buildFamilyUpgradeQuote } from '../_shared/upgrade.ts';
import type { BillingCurrency, BillingInterval } from '../_shared/billing.ts';

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

    const body = (await req.json()) as {
      billing_interval?: BillingInterval;
      currency?: BillingCurrency;
      household_id?: string | null;
    };

    if (!body.billing_interval || !body.currency) {
      return jsonResponse({ error: 'billing_interval and currency are required' }, 400);
    }

    const service = createServiceClient();
    const quote = await buildFamilyUpgradeQuote(service, {
      userId: user.id,
      billingInterval: body.billing_interval,
      currency: body.currency,
      householdId: body.household_id,
    });

    return jsonResponse({ quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: message }, 400);
  }
});
