/** Production Google tag from analytics. Override with VITE_GA_MEASUREMENT_ID if needed. */
const PRODUCTION_MEASUREMENT_ID = 'G-R6G825FF6R';

const ENV_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();

/** GA4 (`G-`), Google tag (`GT-`), or Google Ads (`AW-`). */
const MEASUREMENT_ID_PATTERN = /^(G|GT|AW)-[A-Za-z0-9]+$/;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function googleAnalyticsMeasurementId(): string | null {
  const configured = ENV_MEASUREMENT_ID || (import.meta.env.PROD ? PRODUCTION_MEASUREMENT_ID : '');
  if (!configured || !MEASUREMENT_ID_PATTERN.test(configured)) {
    return null;
  }
  return configured;
}

let started = false;

/** Load gtag.js when a measurement ID is configured. No-ops otherwise. */
export function initGoogleAnalytics(): void {
  const id = googleAnalyticsMeasurementId();
  if (!id || started || typeof document === 'undefined') return;
  started = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js expects the Arguments object, not a rest array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** SPA navigations do not reload index.html, so page views are sent explicitly. */
export function trackPageView(pagePath: string): void {
  const id = googleAnalyticsMeasurementId();
  if (!id || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: pagePath,
    send_to: id,
  });
}
