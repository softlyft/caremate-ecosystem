import { splitFullName } from '@/domains/emergency/constants';

/**
 * Canonical account display name helpers.
 *
 * Home and Me must resolve identity the same way. Prefer a registered person
 * name (profiles / emergency / auth metadata) over an email local-part stub.
 */

export function emailLocalPart(email: string | null | undefined): string {
  const value = email?.trim() ?? '';
  if (!value || !value.includes('@')) return '';
  return value.split('@')[0]?.trim() ?? '';
}

/** True when the name is blank or is just the email local-part (not a real name). */
export function isWeakDisplayName(
  name: string | null | undefined,
  email?: string | null,
): boolean {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return true;
  const local = emailLocalPart(email);
  if (local && trimmed.toLowerCase() === local.toLowerCase()) return true;
  // Entire email pasted as "name"
  if (email?.trim() && trimmed.toLowerCase() === email.trim().toLowerCase()) return true;
  return false;
}

export function preferDisplayName(
  candidates: Array<string | null | undefined>,
  options?: { email?: string | null; fallback?: string },
): string {
  const email = options?.email ?? null;
  const fallback = options?.fallback?.trim() || 'CareMate User';

  const trimmed = candidates
    .map((value) => value?.trim() ?? '')
    .filter((value) => value.length > 0);

  const strong = trimmed.find((value) => !isWeakDisplayName(value, email));
  if (strong) return strong;

  if (trimmed[0]) return trimmed[0];
  return fallback;
}

export function resolveAccountDisplayName(input: {
  profileFullName?: string | null;
  emergencyFullName?: string | null;
  authFullName?: string | null;
  email?: string | null;
  fallback?: string;
}): string {
  return preferDisplayName(
    [input.profileFullName, input.emergencyFullName, input.authFullName],
    { email: input.email, fallback: input.fallback },
  );
}

export function resolveAccountFirstName(input: {
  profileFullName?: string | null;
  emergencyFullName?: string | null;
  authFullName?: string | null;
  email?: string | null;
}): string | null {
  const full = resolveAccountDisplayName({ ...input, fallback: '' });
  if (!full) return null;
  // Don't greet with an email local-part.
  if (isWeakDisplayName(full, input.email)) return null;
  const first = splitFullName(full).firstName.trim();
  return first || null;
}
