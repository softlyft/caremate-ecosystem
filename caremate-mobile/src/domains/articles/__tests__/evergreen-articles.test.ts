import type { Article } from '@/types';
import {
  articleMatchesNewsRegion,
  getCalendarDaysAgo,
  getFirstSeenAt,
  getNewsRegions,
  HOME_TRENDING_COUNTRY_SLOTS,
  HOME_TRENDING_INT_SLOTS,
  isWithinExternalNewsRetention,
  mergeNewsRegions,
  orderTrendingFeed,
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

describe('home trending news ordering', () => {
  const evergreen = [
    makeArticle({
      id: 'evergreen-1',
      title: 'CareMate A',
      sourceUrl: null,
      categoryId: 'nutrition',
      categoryName: 'Nutrition',
    }),
    makeArticle({
      id: 'evergreen-2',
      title: 'CareMate B',
      sourceUrl: null,
      categoryId: 'nutrition',
      categoryName: 'Nutrition',
    }),
  ];

  const intNews = [
    makeArticle({
      id: 'currents-int-1',
      title: 'INT 1',
      sourceUrl: 'https://example.com/int-1',
      publishedAt: '2026-07-10T10:00:00.000Z',
      attributes: { newsCountryCode: 'INT', newsRegions: ['INT'] },
    }),
    makeArticle({
      id: 'currents-int-2',
      title: 'INT 2',
      sourceUrl: 'https://example.com/int-2',
      publishedAt: '2026-07-09T10:00:00.000Z',
      attributes: { newsCountryCode: 'INT', newsRegions: ['INT'] },
    }),
    makeArticle({
      id: 'currents-int-3',
      title: 'INT 3',
      sourceUrl: 'https://example.com/int-3',
      publishedAt: '2026-07-08T10:00:00.000Z',
      attributes: { newsCountryCode: 'INT', newsRegions: ['INT'] },
    }),
  ];

  const ngNews = [
    makeArticle({
      id: 'currents-ng-1',
      title: 'NG 1',
      sourceUrl: 'https://example.com/ng-1',
      publishedAt: '2026-07-11T10:00:00.000Z',
      attributes: { newsCountryCode: 'NG', newsRegions: ['NG'] },
    }),
    makeArticle({
      id: 'currents-ng-2',
      title: 'NG 2',
      sourceUrl: 'https://example.com/ng-2',
      publishedAt: '2026-07-07T10:00:00.000Z',
      attributes: { newsCountryCode: 'NG', newsRegions: ['NG'] },
    }),
  ];

  it('orders 1 CareMate + 2 INT + 2 country news', () => {
    const ordered = orderTrendingFeed(evergreen, [...intNews, ...ngNews], {
      userKey: 'user-1',
      countryCode: 'NG',
      intSlots: HOME_TRENDING_INT_SLOTS,
      countrySlots: HOME_TRENDING_COUNTRY_SLOTS,
    });

    expect(ordered).toHaveLength(5);
    expect(isEvergreen(ordered[0]!)).toBe(true);
    expect(ordered.slice(1, 3).map((item) => item.id)).toEqual([
      'currents-int-1',
      'currents-int-2',
    ]);
    expect(ordered.slice(3).map((item) => item.id)).toEqual(['currents-ng-1', 'currents-ng-2']);
  });

  it('hides the country block when no country news exists', () => {
    const ordered = orderTrendingFeed(evergreen, intNews, {
      userKey: 'user-1',
      countryCode: 'NG',
    });

    expect(ordered).toHaveLength(3);
    expect(isEvergreen(ordered[0]!)).toBe(true);
    expect(ordered.slice(1).every((item) => articleMatchesNewsRegion(item, 'INT'))).toBe(true);
  });

  it('dedupes an article that belongs to both INT and country regions', () => {
    const shared = makeArticle({
      id: 'currents-shared',
      title: 'Shared',
      sourceUrl: 'https://example.com/shared',
      publishedAt: '2026-07-12T10:00:00.000Z',
      attributes: { newsCountryCode: 'NG', newsRegions: ['INT', 'NG'] },
    });

    const ordered = orderTrendingFeed(evergreen, [shared, ...intNews, ...ngNews], {
      userKey: 'user-1',
      countryCode: 'NG',
    });

    const ids = ordered.map((item) => item.id);
    expect(ids.filter((id) => id === 'currents-shared')).toHaveLength(1);
    expect(ids.indexOf('currents-shared')).toBe(1);
  });

  it('merges news regions on refresh upserts', () => {
    expect(mergeNewsRegions({ newsCountryCode: 'INT', newsRegions: ['INT'] }, 'NG')).toEqual({
      newsCountryCode: 'NG',
      newsRegions: ['INT', 'NG'],
    });
  });

  it('treats untagged external news as INT', () => {
    const legacy = makeArticle({
      id: 'currents-legacy',
      title: 'Legacy',
      sourceUrl: 'https://example.com/legacy',
      attributes: {},
    });

    expect(getNewsRegions(legacy)).toEqual(['INT']);
    expect(articleMatchesNewsRegion(legacy, 'INT')).toBe(true);
  });
});

describe('external news retention', () => {
  const now = new Date('2026-07-21T15:00:00.000Z');

  it('keeps stories within seven calendar days and drops older', () => {
    const today = makeArticle({
      id: 'currents-today',
      title: 'Today',
      sourceUrl: 'https://example.com/t',
      attributes: { firstSeenAt: '2026-07-21T08:00:00.000Z' },
    });
    const sixDays = makeArticle({
      id: 'currents-6',
      title: 'Six days',
      sourceUrl: 'https://example.com/6',
      attributes: { firstSeenAt: '2026-07-15T08:00:00.000Z' },
    });
    const sevenDays = makeArticle({
      id: 'currents-7',
      title: 'Seven days',
      sourceUrl: 'https://example.com/7',
      attributes: { firstSeenAt: '2026-07-14T08:00:00.000Z' },
    });

    expect(isWithinExternalNewsRetention(today, now)).toBe(true);
    expect(isWithinExternalNewsRetention(sixDays, now)).toBe(true);
    expect(isWithinExternalNewsRetention(sevenDays, now)).toBe(false);
  });

  it('prefers firstSeenAt over createdAt for day bucketing', () => {
    const article = makeArticle({
      id: 'currents-stable',
      title: 'Stable',
      sourceUrl: 'https://example.com/s',
      createdAt: '2026-07-21T12:00:00.000Z',
      attributes: { firstSeenAt: '2026-07-19T01:00:00.000Z' },
    });
    expect(getFirstSeenAt(article)).toBe('2026-07-19T01:00:00.000Z');
    expect(getCalendarDaysAgo(getFirstSeenAt(article)!, now)).toBe(2);
  });
});

function isEvergreen(article: Article): boolean {
  return article.id.startsWith('evergreen-');
}
