import type { MiniAppDefinition } from '@/mini-apps/_kit/registry';
import { translateText } from '@/domains/localization/i18n/translate';

const MAX_RESULTS_PER_SECTION = 8;

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function matchesSearchText(haystack: string | null | undefined, query: string): boolean {
  if (!haystack) {
    return false;
  }
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return haystack.toLowerCase().includes(normalizedQuery);
}

export function filterMiniApps(query: string, apps: MiniAppDefinition[]): MiniAppDefinition[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return [];
  }

  return apps
    .filter((app) => app.available)
    .filter((app) => {
      const name = translateText('en', `apps.registry.${app.id}.name`);
      const description = translateText('en', `apps.registry.${app.id}.description`);
      return matchesSearchText(name, normalized) || matchesSearchText(description, normalized);
    })
    .slice(0, MAX_RESULTS_PER_SECTION);
}

export { MAX_RESULTS_PER_SECTION };
