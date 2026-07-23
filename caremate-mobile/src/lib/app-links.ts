import Constants, { ExecutionEnvironment } from 'expo-constants';

import { config } from '@/constants/env';

/** HTTPS hosts allowed for Universal Links / App Links (auth, share, billing). */
export function isAllowedAppLinkHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return __DEV__;
  return (
    host === 'getcaremate.com' ||
    host === 'www.getcaremate.com' ||
    host === 'dev.getcaremate.com' ||
    host.endsWith('.getcaremate.com')
  );
}

/**
 * Prefer verified https://getcaremate.com/… links outside Expo Go when the
 * website origin is an allowlisted CareMate host.
 */
export function shouldPreferHttpsAppLinks(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }

  try {
    const url = new URL(config.websiteUrl);
    return url.protocol === 'https:' && isAllowedAppLinkHostname(url.hostname);
  } catch {
    return false;
  }
}

/** Build `https://{website}/{path}` (no trailing slash on origin). */
export function buildHttpsAppLink(path: string): string {
  const normalized = path.replace(/^\//, '');
  return `${config.websiteUrl.replace(/\/$/, '')}/${normalized}`;
}
