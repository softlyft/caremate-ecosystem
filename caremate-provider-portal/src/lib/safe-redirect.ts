/** Safe post-login redirect: relative /app paths only (blocks open redirects). */
export function sanitizePostLoginPath(next: string | null | undefined): string {
  const fallback = '/app/dashboard';
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('://')) return fallback;
  if (value.includes('\\') || value.includes('\n') || value.includes('\r')) return fallback;
  if (value.includes('..')) return fallback;
  if (!/^\/app(\/|$)/.test(value)) return fallback;
  return value;
}
