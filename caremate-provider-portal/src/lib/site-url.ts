import { getCareUrl, getWebsiteUrl, requireEnvUrl } from '@/lib/env';

export { getCareUrl, getWebsiteUrl };

/** Canonical origin for this portal instance (no trailing slash). */
export function getAppUrl(): string {
  return requireEnvUrl('NEXT_PUBLIC_APP_URL');
}
