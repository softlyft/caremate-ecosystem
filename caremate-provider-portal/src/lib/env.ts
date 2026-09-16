/** Absolute public origin from env (no trailing slash). Throws if missing/invalid. */
export function requireEnvUrl(name: string): string {
  const raw = process.env[name]?.trim() ?? '';
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
  return raw.replace(/\/$/, '');
}

/** Care Portal public origin — used for payment return URLs. */
export function getCareUrl(): string {
  return requireEnvUrl('NEXT_PUBLIC_CARE_URL');
}

/** Marketing website origin. */
export function getWebsiteUrl(): string {
  return requireEnvUrl('NEXT_PUBLIC_WEBSITE_URL');
}

/** Hosted payment gateway origin. */
export function getPaymentUrl(): string {
  return requireEnvUrl('NEXT_PUBLIC_PAYMENT_URL');
}

/** Fail fast when the Care Portal boots without required public URLs. */
export function assertPublicEnv(): void {
  requireEnvUrl('NEXT_PUBLIC_APP_URL');
  getCareUrl();
  getWebsiteUrl();
  getPaymentUrl();
}
