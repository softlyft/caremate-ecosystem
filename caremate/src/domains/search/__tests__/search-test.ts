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
    expect(filterMiniApps('medicine', sampleApps).map((app) => app.id)).toEqual([
      'medication-tracker',
    ]);
    expect(filterMiniApps('checkup', sampleApps)).toEqual([]);
    expect(filterMiniApps('   ', sampleApps)).toEqual([]);
  });
});
