import {
  buildArticleShareContent,
  buildArticleShareUrl,
  parseArticleIdFromShareUrl,
} from '@/domains/articles/share';

jest.mock('@/constants/env', () => ({
  config: {
    websiteUrl: 'https://getcaremate.com',
  },
}));

describe('article share helpers', () => {
  it('builds public https website links (never caremate://)', () => {
    expect(buildArticleShareUrl('evergreen-hydration')).toBe(
      'https://getcaremate.com/articles/evergreen-hydration',
    );
  });

  it('parses article ids from legacy deep links and https id URLs', () => {
    expect(parseArticleIdFromShareUrl('caremate://articles/evergreen-1')).toBe('evergreen-1');
    expect(parseArticleIdFromShareUrl('https://getcaremate.com/articles/evergreen-2')).toBe(
      'evergreen-2',
    );
    expect(
      parseArticleIdFromShareUrl('https://getcaremate.com/articles/nutrition/stay-hydrated'),
    ).toBeNull();
    expect(parseArticleIdFromShareUrl('https://evil.example/articles/x')).toBeNull();
    expect(parseArticleIdFromShareUrl('not-a-link')).toBeNull();
  });

  it('includes website link and image URL in the Android share message', () => {
    const content = buildArticleShareContent(
      {
        id: 'evergreen-1',
        title: 'Stay hydrated',
        summary: 'Drink water daily.',
        imageUrl: 'https://cdn.example.com/cover.jpg',
      },
      { continueReading: 'Read the full article:' },
      'android',
    );

    expect(content.title).toBe('Stay hydrated');
    expect(content.message).toContain('Stay hydrated');
    expect(content.message).toContain('Drink water daily.');
    expect(content.message).toContain('Read the full article:');
    expect(content.message).toContain('https://getcaremate.com/articles/evergreen-1');
    expect(content.message).not.toContain('caremate://');
    expect(content.message).toContain('https://cdn.example.com/cover.jpg');
    expect(content.url).toBeUndefined();
  });

  it('sets the website link as Share url on iOS', () => {
    const content = buildArticleShareContent(
      {
        id: 'evergreen-1',
        title: 'Stay hydrated',
        summary: null,
        imageUrl: null,
      },
      undefined,
      'ios',
    );
    expect(content.url).toBe('https://getcaremate.com/articles/evergreen-1');
    expect(content.message).toContain('https://getcaremate.com/articles/evergreen-1');
    expect(content.message).not.toContain('caremate://');
  });
});
