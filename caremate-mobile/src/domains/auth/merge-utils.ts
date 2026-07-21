/**
 * Pure helpers mirrored from migrate-guest-data merge rules for unit tests.
 * Keep behavior aligned with `preferText` / `preferList` in that module.
 */
export function preferText(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (primary && primary.trim().length > 0) {
    return primary;
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  return primary ?? fallback ?? null;
}

export function preferList<T>(primary: T[] | undefined, fallback: T[] | undefined): T[] {
  if (primary && primary.length > 0) {
    return primary;
  }
  return fallback ?? [];
}
