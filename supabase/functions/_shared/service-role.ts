/**
 * Authorize service-role callers for Edge Functions that send OTPs / mail
 * without an end-user JWT. Prefer exact key match (Authorization Bearer and/or
 * apikey). Keys are trimmed — Amplify/CI secrets often include a trailing newline.
 */
export function isServiceRoleRequest(req: Request): boolean {
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!serviceKey) {
    return false;
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = (req.headers.get('apikey') ?? '').trim();

  return bearer === serviceKey || apiKey === serviceKey;
}
