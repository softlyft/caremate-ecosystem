import { estimateReadingTime, HEALTH_CATEGORIES } from '@/domains/articles/categories';
import {
  formatLearnContentType,
  isLearnContentType,
  LEARN_CONTENT_TYPES,
  PRIMARY_LEARN_CONTENT_TYPES,
} from '@/domains/articles/content-types';
import type { Article } from '@/types';
import {
  getLegacySeedIds,
  isEvergreenArticle,
  isExternalArticle,
  LEARN_CATEGORIES,
  orderLearnFeed,
  pickDailyEvergreen,
} from '@/domains/articles/utils/evergreen-articles';

function makeArticle(partial: Partial<Article> & Pick<Article, 'id' | 'title'>): Article {
  return {
    summary: null,
    content: partial.title,
    contentType: 'article',
    categoryId: 'health',
    categoryName: 'Health News',
    imageUrl: null,
    sourceUrl: partial.sourceUrl ?? null,
    publishedAt: partial.publishedAt ?? '2026-01-01T00:00:00.000Z',
    attributes: partial.attributes ?? {},
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('articles/categories', () => {
  it('exposes the Learn health category catalog', () => {
    expect(HEALTH_CATEGORIES.length).toBeGreaterThanOrEqual(8);
    expect(HEALTH_CATEGORIES.every((category) => category.slug && category.accent)).toBe(true);
  });

  it('estimates reading time with a 3-minute floor', () => {
    expect(estimateReadingTime('short')).toBe(3);
    // 400 words / 200 = 2 → floored to 3
    expect(estimateReadingTime(Array.from({ length: 400 }, () => 'word').join(' '))).toBe(3);
    expect(estimateReadingTime(Array.from({ length: 1000 }, () => 'word').join(' '))).toBe(5);
  });
});

describe('articles/content-types', () => {
  it('validates and formats Learn content types', () => {
    expect(LEARN_CONTENT_TYPES).toContain('article');
    expect(PRIMARY_LEARN_CONTENT_TYPES[0]).toBe('article');
    expect(isLearnContentType('video')).toBe(true);
    expect(isLearnContentType('reel')).toBe(false);
    expect(formatLearnContentType('health_alert')).toBe('Health Alert');
    expect(formatLearnContentType('custom_kind')).toBe('custom kind');
  });
});

describe('articles/evergreen feed helpers', () => {
  it('classifies evergreen vs external articles', () => {
    expect(isExternalArticle(makeArticle({ id: 'currents-1', title: 'N', sourceUrl: null }))).toBe(
      true,
    );
    expect(
      isExternalArticle(makeArticle({ id: 'x', title: 'N', sourceUrl: 'https://example.com/a' })),
    ).toBe(true);
    expect(isEvergreenArticle(makeArticle({ id: 'evergreen-1', title: 'A' }))).toBe(true);
    expect(isEvergreenArticle(makeArticle({ id: 'portal-1', title: 'A', sourceUrl: null }))).toBe(
      true,
    );
    expect(
      isEvergreenArticle(
        makeArticle({ id: 'currents-1', title: 'N', sourceUrl: 'https://example.com' }),
      ),
    ).toBe(false);
  });

  it('exposes legacy seed ids and Learn categories including Health News', () => {
    expect(getLegacySeedIds()).toEqual(['article-1', 'article-2', 'article-3']);
    expect(LEARN_CATEGORIES.some((category) => category.id === 'health')).toBe(true);
    expect(LEARN_CATEGORIES.length).toBe(HEALTH_CATEGORIES.length + 1);
  });

  it('picks a stable daily evergreen for a user/day', () => {
    const articles = [
      makeArticle({ id: 'evergreen-1', title: 'A' }),
      makeArticle({ id: 'evergreen-2', title: 'B' }),
      makeArticle({ id: 'evergreen-3', title: 'C' }),
    ];
    const date = new Date(2026, 6, 17);
    const first = pickDailyEvergreen(articles, 'user-a', date);
    const second = pickDailyEvergreen(articles, 'user-a', date);
    expect(first?.id).toBe(second?.id);
    expect(pickDailyEvergreen([], 'user-a', date)).toBeNull();
    expect(pickDailyEvergreen(articles, 'user-b', date)?.id).toBeDefined();
  });

  it('orders Learn feed as featured evergreen, then news, then remaining evergreen', () => {
    const evergreenA = makeArticle({ id: 'evergreen-1', title: 'A' });
    const evergreenB = makeArticle({ id: 'evergreen-2', title: 'B' });
    const newsNew = makeArticle({
      id: 'currents-2',
      title: 'News new',
      sourceUrl: 'https://example.com/2',
      publishedAt: '2026-07-10T00:00:00.000Z',
    });
    const newsOld = makeArticle({
      id: 'currents-1',
      title: 'News old',
      sourceUrl: 'https://example.com/1',
      publishedAt: '2026-07-01T00:00:00.000Z',
    });

    const ordered = orderLearnFeed([evergreenA, evergreenB, newsOld, newsNew], 'user-1');
    expect(isEvergreenArticle(ordered[0]!)).toBe(true);
    expect(ordered.slice(1, 3).map((item) => item.id)).toEqual(['currents-2', 'currents-1']);
    expect(ordered.filter(isEvergreenArticle)).toHaveLength(2);
  });
});
