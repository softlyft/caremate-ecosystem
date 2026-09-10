/**
 * Allow only CareMate app deep links and payment-gateway / Care Portal return pages
 * for Stripe/Paystack redirects. Rejects javascript:, data:, and arbitrary https origins
 * (open redirect).
 *
 * HTTPS URLs must be on an allowlisted CareMate host (see allowed-hosts.ts). Path is not
 * restricted to /success|/cancel so Care Portal org checkout can return to
 * `/app/settings/billing` and `/payer/settings/billing`, and cancel to website pricing.
 */
import { isAllowedHttpsHostname } from './allowed-hosts.ts';

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
      if (!isAllowedHttpsHostname(host)) return false;

      // Hosted checkout pages may nest a further app/web return URL.
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (
        path === '/success' ||
        path === '/cancel' ||
        path === '/billing/success' ||
        path === '/billing/cancel'
      ) {
        const nested = url.searchParams.get('return');
        if (nested && !isAllowedAppReturnUrl(nested)) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function assertAllowedReturnUrls(successUrl: string, cancelUrl: string): void {
  if (!isAllowedAppReturnUrl(successUrl) || !isAllowedAppReturnUrl(cancelUrl)) {
    throw new Error(
      'success_url and cancel_url must be CareMate billing deep links or allowlisted CareMate https hosts',
    );
  }
}
