import type { AdministrativeLevel, CommunityCountry } from '@/types/community';

export const CUSTOM_ADMINISTRATIVE_VALUE = '__custom__';

export function sortedAdministrativeLevels(
  country: CommunityCountry | undefined,
): AdministrativeLevel[] {
  return [...(country?.administrative_level_config ?? [])].sort(
    (left, right) => left.order - right.order,
  );
}

export function optionsForAdministrativeLevel(
  country: CommunityCountry | undefined,
  level: AdministrativeLevel,
  hierarchy: Record<string, string>,
): string[] {
  const options = country?.administrative_options?.[level.key];
  if (!options) return [];

  if (Array.isArray(options)) {
    return options;
  }

  const parentKey = level.depends_on;
  if (!parentKey) return [];
  const parentValue = hierarchy[parentKey]?.trim();
  if (!parentValue) return [];

  const childOptions = options[parentValue];
  return Array.isArray(childOptions) ? childOptions : [];
}

export function sanitizeAdministrativeHierarchy(
  levels: AdministrativeLevel[],
  hierarchy: Record<string, string>,
): Record<string, string> {
  const allowedKeys = new Set(levels.map((level) => level.key));
  const next: Record<string, string> = {};

  for (const level of [...levels].sort((a, b) => a.order - b.order)) {
    if (!allowedKeys.has(level.key)) continue;
    const value = hierarchy[level.key]?.trim();
    if (!value) continue;
    if (level.depends_on && !next[level.depends_on]) continue;
    next[level.key] = value;
  }

  return next;
}
