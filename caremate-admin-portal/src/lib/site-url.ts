/** Canonical origin for this portal (no trailing slash). */
export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** CareMate marketing site origin. */
export function getWebsiteUrl(): string {
  return (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://getcaremate.com').replace(/\/$/, '');
}
