import type { Article } from '@/types/database';

export type ExternalNewsRegion = 'INT' | 'NG';

export function getNewsRegions(article: Article): string[] {
  const attrs = (article.attributes ?? {}) as Record<string, unknown>;
  const regions = attrs.newsRegions;
  if (Array.isArray(regions)) {
    return regions
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toUpperCase());
  }
  const single = attrs.newsCountryCode;
  if (typeof single === 'string' && single.trim()) {
    return [single.trim().toUpperCase()];
  }
  return [];
}
