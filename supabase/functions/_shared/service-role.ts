/**
 * Authorize service-role callers for Edge Functions that send OTPs / mail
 * without an end-user JWT.
 *
 * Accepts:
 * - Exact match on legacy `SUPABASE_SERVICE_ROLE_KEY` or any `SUPABASE_SECRET_KEYS`
 *   value (new `sb_secret_…` keys), on Authorization Bearer and/or apikey
 * - Legacy `service_role` JWTs verified against Auth Admin (platform may remap
 *   `SUPABASE_SERVICE_ROLE_KEY` to a secret key after the API-keys migration)
 *
 * Keys are trimmed — Amplify/CI secrets often include a trailing newline.
 */

function requestTokens(req: Request): string[] {
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = (req.headers.get('apikey') ?? '').trim();
  return [...new Set([bearer, apiKey].filter(Boolean))];
}

function configuredServiceKeys(): string[] {
  const keys = new Set<string>();
  const legacy = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (legacy) keys.add(legacy);

  const single = (Deno.env.get('SUPABASE_SECRET_KEY') ?? '').trim();
  if (single) keys.add(single);

  const raw = (Deno.env.get('SUPABASE_SECRET_KEYS') ?? '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const value of Object.values(parsed as Record<string, unknown>)) {
          if (typeof value === 'string' && value.trim()) keys.add(value.trim());
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return [...keys];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function looksLikeLegacyServiceRoleJwt(token: string): boolean {
  if (!token.startsWith('eyJ')) return false;
  const payload = decodeJwtPayload(token);
  return payload?.role === 'service_role';
}

/** Confirm a legacy service_role JWT is accepted by this project's Auth Admin API. */
async function verifyLegacyServiceRoleJwt(token: string): Promise<boolean> {
  const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  if (!base) return false;

  try {
    const res = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function isServiceRoleRequest(req: Request): Promise<boolean> {
  const tokens = requestTokens(req);
  if (tokens.length === 0) return false;

  const allowed = configuredServiceKeys();
  if (tokens.some((token) => allowed.includes(token))) {
    return true;
  }

  for (const token of tokens) {
    if (looksLikeLegacyServiceRoleJwt(token) && (await verifyLegacyServiceRoleJwt(token))) {
      return true;
    }
  }

  return false;
}
