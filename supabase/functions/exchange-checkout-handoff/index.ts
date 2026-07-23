import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Public (anon): exchange a single-use checkout handoff code for session tokens.
 * Body: { code: string }
 * Returns: { access_token, refresh_token }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = (await req.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return jsonResponse({ error: 'code is required' }, 400);
    }

    const codeHash = await sha256Hex(code);
    const service = createServiceClient();
    const now = new Date().toISOString();

    const { data: row, error } = await service
      .from('checkout_handoffs')
      .select('id, access_token, refresh_token, expires_at, used_at')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }
    if (!row || row.used_at || row.expires_at < now || !row.access_token || !row.refresh_token) {
      return jsonResponse({ error: 'Invalid or expired handoff code' }, 400);
    }

    // Atomic claim: only one concurrent exchanger wins; clear tokens after use.
    const { data: claimed, error: updateError } = await service
      .from('checkout_handoffs')
      .update({
        used_at: now,
        access_token: null,
        refresh_token: null,
      })
      .eq('id', row.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }
    if (!claimed) {
      return jsonResponse({ error: 'Invalid or expired handoff code' }, 400);
    }

    return jsonResponse({
      access_token: row.access_token,
      refresh_token: row.refresh_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('exchange-checkout-handoff', message);
    return jsonResponse({ error: message }, 500);
  }
});
