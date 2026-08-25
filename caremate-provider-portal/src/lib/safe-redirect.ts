/** Safe post-login redirect: relative /app or /payer paths only (blocks open redirects). */
export function sanitizePostLoginPath(
  next: string | null | undefined,
  fallback: '/app/dashboard' | '/payer/dashboard' = '/app/dashboard',
): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('://')) return fallback;
  if (value.includes('\\') || value.includes('\n') || value.includes('\r')) return fallback;
  if (value.includes('..')) return fallback;
  if (!/^\/(app|payer)(\/|$)/.test(value)) return fallback;
  return value;
}

/** Pick default home when no `next` is provided. Dual membership prefers provider unless cookie says payer. */
export function resolveCareHomePath(input: {
  hasProvider: boolean;
  hasPayer: boolean;
  preferredKind?: string | null;
}): '/app/dashboard' | '/payer/dashboard' {
  if (input.hasProvider && input.hasPayer) {
    return input.preferredKind === 'payer' ? '/payer/dashboard' : '/app/dashboard';
  }
  if (input.hasPayer) return '/payer/dashboard';
  return '/app/dashboard';
}
