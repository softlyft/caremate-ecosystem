import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

/**
 * Authenticated: permanently delete the caller's auth user.
 * Cloud rows cascade from auth.users; billing provider cancel is best-effort.
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

    const service = createServiceClient();

    // Best-effort: cancel active provider subscriptions before auth delete.
    try {
      const { data: subscriptions } = await service
        .from('subscriptions')
        .select('id, provider, provider_subscription_id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due']);

      for (const sub of subscriptions ?? []) {
        const providerSubId =
          typeof sub.provider_subscription_id === 'string'
            ? sub.provider_subscription_id.trim()
            : '';
        if (!providerSubId) {
          continue;
        }
        if (sub.provider === 'stripe') {
          const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
          if (stripeKey) {
            await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${stripeKey}` },
            });
          }
        } else if (sub.provider === 'paystack') {
          const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
          if (paystackKey) {
            await fetch('https://api.paystack.co/subscription/disable', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${paystackKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: providerSubId, token: providerSubId }),
            });
          }
        }
      }
    } catch {
      // Provider cancel failures must not block account erasure.
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return jsonResponse({ error: message }, 500);
  }
});
