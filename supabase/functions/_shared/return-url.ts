/**
 * Allow only CareMate app deep links and payment-gateway return pages for Stripe/Paystack redirects.
 * Rejects javascript:, data:, and arbitrary https origins (open redirect).
 */
const ALLOWED_HTTPS_HOST_SUFFIXES = [
  'caremate.app',
  'localhost',
  '127.0.0.1',
  'amplifyapp.com',
];

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
      const host = url.hostname.toLowerCase();
      const hostOk = ALLOWED_HTTPS_HOST_SUFFIXES.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`),
      );
      if (!hostOk) return false;

      // Hosted checkout pages used as Stripe/Paystack callbacks.
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (path === '/success' || path === '/cancel') {
        const nested = url.searchParams.get('return');
        if (nested && !isAllowedAppReturnUrl(nested)) return false;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  return false;
}

export function assertAllowedReturnUrls(successUrl: string, cancelUrl: string): void {
  if (!isAllowedAppReturnUrl(successUrl) || !isAllowedAppReturnUrl(cancelUrl)) {
    throw new Error(
      'success_url and cancel_url must be CareMate billing deep links or allowlisted /success|/cancel hosts',
    );
  }
}
