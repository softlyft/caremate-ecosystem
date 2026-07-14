import learnData from '@/domains/articles/data/learn.json';
import { HEALTH_CATEGORIES } from '@/domains/articles/categories';
import type { Article, ArticleCategory } from '@/types';

export type LearnCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

export interface EvergreenArticleSeed {
  id: string;
  title: string;
  summary: string;
  content: string;
}

const LEARN_BY_CATEGORY = learnData as Record<LearnCategoryId, EvergreenArticleSeed[]>;

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

export function getEvergreenSeeds(): Omit<
  Article,
  'syncStatus' | 'deletedAt' | 'createdAt' | 'updatedAt'
>[] {
  const publishedAt = new Date().toISOString();
  const seeds: Omit<Article, 'syncStatus' | 'deletedAt' | 'createdAt' | 'updatedAt'>[] = [];

  for (const category of HEALTH_CATEGORIES) {
    const articles = LEARN_BY_CATEGORY[category.id] ?? [];
    for (const article of articles) {
      seeds.push({
        id: article.id,
        title: article.title,
        summary: article.summary,
        content: article.content,
        contentType: 'article',
        categoryId: category.id,
        categoryName: category.name,
        imageUrl: null,
        sourceUrl: null,
        publishedAt,
        attributes: {},
      });
    }
  }

  return seeds;
}

export function getLegacySeedIds(): readonly string[] {
  return LEGACY_SEED_IDS;
}

export function isExternalArticle(article: Article): boolean {
  return Boolean(article.sourceUrl) || article.id.startsWith('currents-');
}

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
