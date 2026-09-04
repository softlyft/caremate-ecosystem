/** Explicit Amplify preview hosts (no wildcard *.amplifyapp.com). */
export const ALLOWED_AMPLIFY_HOSTS = [
  'main.dim7uuolmjgc9.amplifyapp.com',
  'main.d3gvtqx2uzn788.amplifyapp.com',
  'main.d9xyppes84zqr.amplifyapp.com',
  'main.d2tlpjx9a9kklb.amplifyapp.com',
  'main.d1wcqa3tsdavz8.amplifyapp.com',
] as const;

export const ALLOWED_HTTPS_HOST_SUFFIXES = [
  'getcaremate.com',
  'localhost',
  '127.0.0.1',
] as const;

export function isAllowedHttpsHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if ((ALLOWED_AMPLIFY_HOSTS as readonly string[]).includes(host)) return true;
  return ALLOWED_HTTPS_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}
