function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

type PublicUrlEnv =
  | 'VITE_WEBSITE_URL'
  | 'VITE_COMMUNITY_PORTAL_URL'
  | 'VITE_CARE_PORTAL_URL';

/** Absolute public origin from Vite env (no trailing slash). Throws if missing/invalid. */
export function requireEnvUrl(name: PublicUrlEnv): string {
  const raw = (import.meta.env[name] as string | undefined)?.trim() ?? '';
  if (!raw) {
    throw new Error(
      `${name} is required. Set it in Amplify env vars or .env.local (see .env.example).`,
    );
  }
  try {
    void new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL (got "${raw}").`);
  }
  return trimTrailingSlash(raw);
}

export function getWebsiteUrl(): string {
  return requireEnvUrl('VITE_WEBSITE_URL');
}

export function getCommunityPortalUrl(): string {
  return requireEnvUrl('VITE_COMMUNITY_PORTAL_URL');
}

export function getCarePortalUrl(): string {
  return requireEnvUrl('VITE_CARE_PORTAL_URL');
}

/** Fail fast when the payment gateway boots without required public URLs. */
export function assertPublicEnv(): void {
  getWebsiteUrl();
  getCommunityPortalUrl();
  getCarePortalUrl();
}
