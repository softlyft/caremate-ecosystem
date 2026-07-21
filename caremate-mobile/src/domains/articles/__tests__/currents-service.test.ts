import { currentsService } from '@/domains/articles/currents-service';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

jest.mock('@/constants/env', () => ({
  config: {
    currentsApiKey: 'test-key',
    isCurrentsConfigured: true,
    currentsCountry: 'NG',
  },
}));

jest.mock('@/domains/localization', () => ({
  localizationService: {
    internationalCountryCode: 'INT',
  },
}));

describe('articles/currents-service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('reports configuration from env', () => {
    expect(currentsService.isConfigured()).toBe(true);
  });

  it('returns [] when Currents is not configured', async () => {
    const { config } = jest.requireMock('@/constants/env') as {
      config: { isCurrentsConfigured: boolean };
    };
    const previous = config.isCurrentsConfigured;
    config.isCurrentsConfigured = false;
    await expect(currentsService.fetchHealthNews(5, 'NG')).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
    config.isCurrentsConfigured = previous;
  });

  it('requests health news and normalizes protocol-relative images', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        news: [
          {
            id: '1',
            title: 'A',
            description: 'd',
            url: 'https://example.com',
            author: 'ed',
            image: '//cdn.example.com/a.jpg',
            language: 'en',
            category: ['health'],
            published: '2026-07-01',
          },
          {
            id: '2',
            title: 'B',
            description: 'd',
            url: 'https://example.com/b',
            author: 'ed',
            image: 'None',
            language: 'en',
            category: ['health'],
            published: '2026-07-02',
          },
        ],
      }),
    });

    const items = await currentsService.fetchHealthNews(1, 'NG', 'en');
    expect(items).toHaveLength(1);
    expect(items[0]!.image).toBe('https://cdn.example.com/a.jpg');

    const url = String(mockFetch.mock.calls[0]![0]);
    expect(url).toContain('category=health');
    expect(url).toContain('country=NG');
    expect(mockFetch.mock.calls[0]![1]).toMatchObject({
      headers: { Authorization: 'test-key' },
    });
  });

  it('omits country for INT / empty region codes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', news: [] }),
    });

    await currentsService.fetchHealthNews(5, 'INT');
    expect(String(mockFetch.mock.calls[0]![0])).not.toContain('country=');

    mockFetch.mockClear();
    await currentsService.fetchHealthNews(5, '  ');
    expect(String(mockFetch.mock.calls[0]![0])).not.toContain('country=');
  });

  it('throws on non-OK responses and returns [] for bad payloads', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(currentsService.fetchHealthNews(5, 'NG')).rejects.toThrow(/Currents API error/);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error' }),
    });
    await expect(currentsService.fetchHealthNews(5, 'NG')).resolves.toEqual([]);
  });
});
