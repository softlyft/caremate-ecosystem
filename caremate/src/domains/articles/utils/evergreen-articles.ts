import { HEALTH_CATEGORIES } from '@/domains/articles/categories';
import { INTERNATIONAL_COUNTRY_CODE } from '@/domains/localization/config';
import type { Article, ArticleCategory } from '@/types';

/** Legacy local seed ids (pre-portal CMS). Soft-deleted on pull/boot if still present. */
const LEGACY_SEED_IDS = ['article-1', 'article-2', 'article-3'] as const;

/** Home featured: 1 CareMate + 2 INT + up to 2 country news. */
export const HOME_TRENDING_INT_SLOTS = 2;
export const HOME_TRENDING_COUNTRY_SLOTS = 2;
export const HOME_TRENDING_MAX_ITEMS =
  1 + HOME_TRENDING_INT_SLOTS + HOME_TRENDING_COUNTRY_SLOTS;

export const LEARN_CATEGORIES: ArticleCategory[] = [
  ...HEALTH_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.id,
    isSubscribed: true,
  })),
  { id: 'health', name: 'Health News', slug: 'health', isSubscribed: true },
];

export function getLegacySeedIds(): readonly string[] {
  return LEGACY_SEED_IDS;
}

export function isExternalArticle(article: Article): boolean {
  return Boolean(article.sourceUrl) || article.id.startsWith('currents-');
}

/** CareMate catalog content from Supabase (not Currents news). */
export function isEvergreenArticle(article: Article): boolean {
  return article.id.startsWith('evergreen-') || (!isExternalArticle(article) && !article.sourceUrl);
}

/**
 * Regions a Currents news row was fetched for.
 * Legacy untagged rows are treated as INT so older caches still fill the international slots.
 */
export function getNewsRegions(article: Article): string[] {
  const attrs = article.attributes ?? {};
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

  // Untagged Currents rows from before dual-fetch tagging → count as international.
  if (isExternalArticle(article)) {
    return [INTERNATIONAL_COUNTRY_CODE];
  }

  return [];
}

export function articleMatchesNewsRegion(article: Article, regionCode: string): boolean {
  const normalized = regionCode.trim().toUpperCase();
  return getNewsRegions(article).includes(normalized);
}

export function mergeNewsRegions(
  existingAttributes: Record<string, unknown> | null | undefined,
  regionCode: string,
): Record<string, unknown> {
  const normalized = regionCode.trim().toUpperCase();
  const previous = new Set<string>();

  if (existingAttributes) {
    const regions = existingAttributes.newsRegions;
    if (Array.isArray(regions)) {
      for (const value of regions) {
        if (typeof value === 'string' && value.trim()) {
          previous.add(value.trim().toUpperCase());
        }
      }
    }
    const single = existingAttributes.newsCountryCode;
    if (typeof single === 'string' && single.trim()) {
      previous.add(single.trim().toUpperCase());
    }
  }

  previous.add(normalized);

  return {
    ...(existingAttributes ?? {}),
    newsCountryCode: normalized,
    newsRegions: [...previous],
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function pickDailyEvergreen(
  articles: Article[],
  userKey = 'guest',
  date = new Date(),
): Article | null {
  if (articles.length === 0) {
    return null;
  }

  const day = getDayOfYear(date);
  const index = (day + hashString(userKey)) % articles.length;
  return articles[index] ?? null;
}

export function orderLearnFeed(articles: Article[], userKey = 'guest'): Article[] {
  const evergreen = articles.filter(isEvergreenArticle);
  const external = articles
    .filter(isExternalArticle)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  const other = articles.filter(
    (article) => !isEvergreenArticle(article) && !isExternalArticle(article),
  );

  const featured = pickDailyEvergreen(evergreen, userKey);
  const remainingEvergreen = featured
    ? evergreen.filter((article) => article.id !== featured.id)
    : evergreen;

  return [...(featured ? [featured] : []), ...external, ...remainingEvergreen, ...other];
}

function byNewest(a: Article, b: Article): number {
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
}

/**
 * Home featured feed:
 * 1 CareMate evergreen → up to `intSlots` INT news → up to `countrySlots` country news.
 * Country block is omitted entirely when empty. Duplicates across INT/country are skipped.
 */
export function orderTrendingFeed(
  evergreen: Article[],
  external: Article[],
  options: {
    userKey?: string;
    countryCode: string;
    intSlots?: number;
    countrySlots?: number;
  },
): Article[] {
  const userKey = options.userKey ?? 'guest';
  const intSlots = options.intSlots ?? HOME_TRENDING_INT_SLOTS;
  const countrySlots = options.countrySlots ?? HOME_TRENDING_COUNTRY_SLOTS;
  const countryCode = options.countryCode.trim().toUpperCase();

  const featured = pickDailyEvergreen(evergreen, userKey);

  const intNews = external
    .filter((article) => articleMatchesNewsRegion(article, INTERNATIONAL_COUNTRY_CODE))
    .sort(byNewest)
    .slice(0, intSlots);

  const usedIds = new Set(intNews.map((article) => article.id));

  const countryNews =
    !countryCode || countryCode === INTERNATIONAL_COUNTRY_CODE
      ? []
      : external
          .filter(
            (article) =>
              articleMatchesNewsRegion(article, countryCode) && !usedIds.has(article.id),
          )
          .sort(byNewest)
          .slice(0, countrySlots);

  return [...(featured ? [featured] : []), ...intNews, ...countryNews];
}
