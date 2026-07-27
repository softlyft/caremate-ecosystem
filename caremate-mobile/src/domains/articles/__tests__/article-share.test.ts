import {
  buildArticleShareContent,
  buildArticleShareUrl,
  parseArticleIdFromShareUrl,
} from '@/domains/articles/share';

jest.mock('@/lib/app-links', () => {
  const actual = jest.requireActual<typeof import('@/lib/app-links')>('@/lib/app-links');
  return {
    ...actual,
    shouldPreferHttpsAppLinks: jest.fn(() => false),
    buildHttpsAppLink: jest.fn((path: string) => `https://getcaremate.com/${path}`),
  };
});

describe('article share helpers', () => {
  it('builds caremate deep links by default', () => {
    expect(buildArticleShareUrl('evergreen-hydration')).toBe(
      'caremate://articles/evergreen-hydration',
    );
  });

  it('builds https Universal Links when preferred', () => {
    const { shouldPreferHttpsAppLinks } = jest.requireMock('@/lib/app-links') as {
      shouldPreferHttpsAppLinks: jest.Mock;
    };
    shouldPreferHttpsAppLinks.mockReturnValueOnce(true);
    expect(buildArticleShareUrl('evergreen-hydration')).toBe(
      'https://getcaremate.com/articles/evergreen-hydration',
    );
  });

  it('parses article ids from deep links and https URLs', () => {
    expect(parseArticleIdFromShareUrl('caremate://articles/evergreen-1')).toBe('evergreen-1');
    expect(parseArticleIdFromShareUrl('https://getcaremate.com/articles/evergreen-2')).toBe(
      'evergreen-2',
    );
    expect(parseArticleIdFromShareUrl('https://evil.example/articles/x')).toBeNull();
    expect(parseArticleIdFromShareUrl('not-a-link')).toBeNull();
  });

  it('includes deep link and image URL in the Android share message', () => {
    const content = buildArticleShareContent(
      {
        id: 'evergreen-1',
        title: 'Stay hydrated',
        summary: 'Drink water daily.',
        imageUrl: 'https://cdn.example.com/cover.jpg',
      },
      { continueReading: 'Continue reading in CareMate:' },
      'android',
    );

    expect(content.title).toBe('Stay hydrated');
    expect(content.message).toContain('Stay hydrated');
    expect(content.message).toContain('Drink water daily.');
    expect(content.message).toContain('Continue reading in CareMate:');
    expect(content.message).toContain('caremate://articles/evergreen-1');
    expect(content.message).toContain('https://cdn.example.com/cover.jpg');
    expect(content.url).toBeUndefined();
  });

  it('sets the deep link as Share url on iOS', () => {
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
    expect(content.url).toBe('caremate://articles/evergreen-1');
    expect(content.message).toContain('caremate://articles/evergreen-1');
  });
});
