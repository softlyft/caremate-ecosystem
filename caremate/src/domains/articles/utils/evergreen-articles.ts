import { HEALTH_CATEGORIES } from '@/domains/articles/categories';
import type { Article, ArticleCategory } from '@/types';

/** Legacy local seed ids (pre-portal CMS). Soft-deleted on pull/boot if still present. */
const LEGACY_SEED_IDS = ['article-1', 'article-2', 'article-3'] as const;

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

export function orderTrendingFeed(
  evergreen: Article[],
  external: Article[],
  limit: number,
  userKey = 'guest',
): Article[] {
  const featured = pickDailyEvergreen(evergreen, userKey);
  const externalSlots = Math.max(0, limit - (featured ? 1 : 0));
  const externals = external
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, externalSlots);

  const combined = [...(featured ? [featured] : []), ...externals];
  if (combined.length >= limit) {
    return combined.slice(0, limit);
  }

  const usedIds = new Set(combined.map((article) => article.id));
  const fillers = evergreen.filter((article) => !usedIds.has(article.id));
  return [...combined, ...fillers].slice(0, limit);
}
