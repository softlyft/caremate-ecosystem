/**
 * Allow only CareMate app deep links (and optional https return hosts) for post-checkout redirects.
 * Rejects javascript:, data:, and arbitrary https origins (DOM XSS / open redirect).
 */

/** Explicit Amplify preview hosts (no wildcard *.amplifyapp.com). */
const ALLOWED_AMPLIFY_HOSTS = new Set([
  'main.dim7uuolmjgc9.amplifyapp.com',
  'main.d3gvtqx2uzn788.amplifyapp.com',
  'main.d9xyppes84zqr.amplifyapp.com',
  'main.d2tlpjx9a9kklb.amplifyapp.com',
  'main.d1wcqa3tsdavz8.amplifyapp.com',
]);

const ALLOWED_HTTPS_HOST_SUFFIXES = ['getcaremate.com', 'localhost', '127.0.0.1'];

function isAllowedHttpsHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (ALLOWED_AMPLIFY_HOSTS.has(host)) return true;
  return ALLOWED_HTTPS_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function isAllowedAppReturnUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > 2048) return false;

  const lower = value.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return false;
  }

  if (lower.startsWith('caremate://')) {
    return (
      lower.startsWith('caremate://billing/success') ||
      lower.startsWith('caremate://billing/cancel')
    );
  }

  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const url = new URL(value);
      if (url.username || url.password) return false;
      if (
        url.protocol === 'http:' &&
        url.hostname !== 'localhost' &&
        url.hostname !== '127.0.0.1'
      ) {
        return false;
      }
      return isAllowedHttpsHostname(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export function sanitizeAppReturnUrl(raw: string | null | undefined, fallback: string): string {
  const candidate = raw?.trim() || fallback;
  return isAllowedAppReturnUrl(candidate) ? candidate : fallback;
}

export function openAppDeepLink(url: string) {
  if (!isAllowedAppReturnUrl(url)) {
    return;
  }
  window.location.href = url;
}
