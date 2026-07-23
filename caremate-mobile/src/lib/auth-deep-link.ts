import * as Linking from 'expo-linking';

import { config } from '@/constants/env';

/** Deep-link path opened from the Supabase password-reset email. */
export const PASSWORD_RESET_PATH = 'auth/reset-password';

const ALLOWED_AUTH_PATH_PREFIXES = [
  'auth/reset-password',
  'auth/callback',
  'billing/success',
  'billing/cancel',
];

/**
 * Redirect URI embedded in the reset email.
 * Must also be allowlisted in Supabase Auth → URL Configuration → Redirect URLs.
 */
export function getPasswordResetRedirectUri(): string {
  return Linking.createURL(PASSWORD_RESET_PATH);
}

export type AuthDeepLinkResult = 'recovery' | 'session' | null;

function isAllowedAuthCallbackUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Expo may produce exp://… or caremate://… — require known path before accepting credentials.
  const lower = trimmed.toLowerCase();
  const hasAllowedPath = ALLOWED_AUTH_PATH_PREFIXES.some(
    (path) => lower.includes(`/${path}`) || lower.includes(`${path}?`) || lower.endsWith(path),
  );
  if (!hasAllowedPath && !lower.includes('code=') && !lower.includes('access_token')) {
    return false;
  }
  if (!hasAllowedPath) {
    // Tokens without an allowlisted path are rejected (prevents arbitrary-scheme credential injection).
    return false;
  }

  try {
    const parsed = Linking.parse(trimmed);
    const scheme = (parsed.scheme ?? '').toLowerCase();
    // Accept CareMate custom scheme and Expo dev schemes only.
    if (
      scheme &&
      scheme !== 'caremate' &&
      scheme !== 'exp' &&
      scheme !== 'exps' &&
      !scheme.startsWith('http')
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Parse an inbound auth URL (query `code` or hash tokens) and establish a session.
 * Rejects URLs that are not on an allowlisted auth/billing callback path.
 */
export async function handleAuthCallbackUrl(
  url: string,
  options: {
    exchangeCodeForSession: (code: string) => Promise<void>;
    setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
  },
): Promise<AuthDeepLinkResult> {
  if (!url || !config.isSupabaseConfigured) {
    return null;
  }

  const normalized = url.trim();
  if (!isAllowedAuthCallbackUrl(normalized)) {
    return null;
  }

  const parsed = Linking.parse(normalized);
  const codeParam = parsed.queryParams?.code;
  const code =
    typeof codeParam === 'string' ? codeParam : Array.isArray(codeParam) ? codeParam[0] : null;

  if (code) {
    await options.exchangeCodeForSession(code);
    return 'recovery';
  }

  const hash = normalized.includes('#') ? normalized.split('#')[1] : '';
  if (hash) {
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');
    if (access_token && refresh_token) {
      await options.setSession({ access_token, refresh_token });
      return type === 'recovery' ? 'recovery' : 'session';
    }
  }

  // Some clients put tokens in query string instead of hash
  const accessQuery = parsed.queryParams?.access_token;
  const refreshQuery = parsed.queryParams?.refresh_token;
  const access_token = typeof accessQuery === 'string' ? accessQuery : null;
  const refresh_token = typeof refreshQuery === 'string' ? refreshQuery : null;
  const typeParam = parsed.queryParams?.type;
  const type = typeof typeParam === 'string' ? typeParam : null;

  if (access_token && refresh_token) {
    await options.setSession({ access_token, refresh_token });
    return type === 'recovery' ? 'recovery' : 'session';
  }

  return null;
}
