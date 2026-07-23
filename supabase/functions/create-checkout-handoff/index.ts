import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const HANDOFF_TTL_MS = 5 * 60 * 1000;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticated: mint a single-use checkout handoff code (stores session tokens server-side).
 * Body: { refresh_token: string }
 * Returns: { code: string, expires_at: string }
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

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as { refresh_token?: string };
    const refreshToken = body.refresh_token?.trim();
    if (!refreshToken) {
      return jsonResponse({ error: 'refresh_token is required' }, 400);
    }

    const code = randomCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS).toISOString();

    const service = createServiceClient();
    // Best-effort prune expired rows for this user.
    await service
      .from('checkout_handoffs')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    const { error: insertError } = await service.from('checkout_handoffs').insert({
      code_hash: codeHash,
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ code, expires_at: expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('create-checkout-handoff', message);
    return jsonResponse({ error: message }, 500);
  }
});
