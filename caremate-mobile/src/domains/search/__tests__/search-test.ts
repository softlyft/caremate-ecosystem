import { runGlobalSearch } from '@/domains/search/service';
import { filterMiniApps, matchesSearchText, normalizeSearchQuery } from '@/domains/search/match';
import type { MiniAppDefinition } from '@/mini-apps/_kit/registry';

const stubIcon = (() => null) as unknown as MiniAppDefinition['icon'];

const sampleApps: MiniAppDefinition[] = [
  {
    id: 'medication-tracker',
    route: '/(app)/apps/medication-tracker',
    icon: stubIcon,
    color: '#000',
    backgroundColor: '#fff',
    available: true,
  },
  {
    id: 'period-tracker',
    route: '/(app)/apps/period-tracker',
    icon: stubIcon,
    color: '#000',
    backgroundColor: '#fff',
    available: true,
  },
  {
    id: 'checkup-planner',
    route: '/(app)/apps/checkup-planner',
    icon: stubIcon,
    color: '#000',
    backgroundColor: '#fff',
    available: false,
  },
];

const mockFindAll = jest.fn();
const mockFindNearby = jest.fn();
const mockResolveNearbyCoords = jest.fn();

jest.mock('@/domains/articles/repository', () => ({
  articleRepository: {
    findAll: (...args: unknown[]) => mockFindAll(...args),
  },
}));

jest.mock('@/domains/providers/repository', () => ({
  providerRepository: {
    findNearby: (...args: unknown[]) => mockFindNearby(...args),
  },
}));

jest.mock('@/domains/providers/location', () => ({
  resolveNearbyCoords: (...args: unknown[]) => mockResolveNearbyCoords(...args),
}));

jest.mock('@/mini-apps/_kit/registry', () => ({
  MINI_APPS: [
    {
      id: 'medication-tracker',
      route: '/(app)/apps/medication-tracker',
      icon: () => null,
      color: '#000',
      backgroundColor: '#fff',
      available: true,
    },
  ],
}));

describe('search helpers', () => {
  test('normalizeSearchQuery trims and collapses whitespace', () => {
    expect(normalizeSearchQuery('  heart   health  ')).toBe('heart health');
  });

  test('matchesSearchText is case-insensitive', () => {
    expect(matchesSearchText('Lagos General Hospital', 'hospital')).toBe(true);
    expect(matchesSearchText('Lagos General Hospital', 'clinic')).toBe(false);
    expect(matchesSearchText(null, 'x')).toBe(false);
  });

  test('filterMiniApps matches registry labels and skips unavailable', () => {
    expect(filterMiniApps('medication', sampleApps).map((app) => app.id)).toEqual([
      'medication-tracker',
    ]);
    expect(filterMiniApps('checkup', sampleApps)).toEqual([]);
    expect(filterMiniApps('   ', sampleApps)).toEqual([]);
  });
});

describe('runGlobalSearch', () => {
  beforeEach(() => {
    mockFindAll.mockReset();
    mockFindNearby.mockReset();
    mockResolveNearbyCoords.mockReset();
    mockResolveNearbyCoords.mockResolvedValue({ latitude: 6.5, longitude: 3.3 });
  });

  it('returns empty sections for blank queries', async () => {
    await expect(runGlobalSearch('   ')).resolves.toEqual({
      query: '',
      articles: [],
      providers: [],
      tools: [],
    });
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it('aggregates articles, providers, and tools', async () => {
    mockFindAll.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }]);
    mockFindNearby.mockResolvedValue({
      providers: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
    });

    const results = await runGlobalSearch('medication', 'user-1');
    expect(results.query).toBe('medication');
    expect(results.articles).toHaveLength(4);
    expect(results.providers).toHaveLength(4);
    expect(results.tools.map((tool) => tool.id)).toEqual(['medication-tracker']);
    expect(mockFindAll).toHaveBeenCalledWith('medication', 'user-1');
    expect(mockFindNearby).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'medication', limit: 8 }),
    );
  });
});
