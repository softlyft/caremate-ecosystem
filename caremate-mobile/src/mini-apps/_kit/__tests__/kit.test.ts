import {
  addDays,
  daysBetween,
  getMonthMatrix,
  parseDateKey,
  startOfDay,
  toDateKey,
} from '@/mini-apps/_kit/date-utils';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { getMiniAppLabel, MINI_APPS } from '@/mini-apps/_kit/registry';
import {
  registerMiniAppRehydrate,
  rehydrateAllMiniAppStores,
} from '@/mini-apps/_kit/rehydrate-registry';
import {
  isMiniAppKey,
  MINI_APP_KEYS,
  MINI_APP_STORAGE_KEYS,
  miniAppSnapshotId,
} from '@/mini-apps/_kit/snapshot-repository';
import { getMiniAppTheme } from '@/mini-apps/_kit/theme';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: [], error: null }),
      upsert: () => ({ error: null }),
      delete: () => ({ eq: () => ({ error: null }) }),
    }),
  },
}));

jest.mock('@/database/client', () => ({
  getDatabase: () => {
    throw new Error('database not available in unit tests');
  },
  isDatabaseInitialized: () => false,
}));

describe('mini-apps/_kit/date-utils', () => {
  it('formats and parses local date keys', () => {
    const date = new Date(2026, 6, 17);
    expect(toDateKey(date)).toBe('2026-07-17');
    expect(toDateKey(parseDateKey('2026-07-17'))).toBe('2026-07-17');
  });

  it('adds days and computes day differences on calendar boundaries', () => {
    const start = parseDateKey('2026-07-17');
    expect(toDateKey(addDays(start, 3))).toBe('2026-07-20');
    expect(toDateKey(addDays(start, -2))).toBe('2026-07-15');
    expect(daysBetween(start, parseDateKey('2026-07-20'))).toBe(3);
    expect(daysBetween(parseDateKey('2026-07-20'), start)).toBe(-3);
  });

  it('normalizes startOfDay', () => {
    const withTime = new Date(2026, 6, 17, 15, 30, 45);
    const start = startOfDay(withTime);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(toDateKey(start)).toBe('2026-07-17');
  });

  it('builds a Sunday-start month matrix padded to full weeks', () => {
    const cells = getMonthMatrix(new Date(2026, 6, 1));
    expect(cells.length % 7).toBe(0);
    const numbered = cells.filter(Boolean) as Date[];
    expect(numbered[0]!.getDate()).toBe(1);
    expect(numbered[numbered.length - 1]!.getDate()).toBe(31);
    expect(cells.slice(0, cells.findIndex(Boolean)).every((cell) => cell === null)).toBe(true);
  });
});

describe('mini-apps/_kit/registry + theme', () => {
  it('lists six available mini apps with routes', () => {
    expect(MINI_APPS).toHaveLength(6);
    expect(MINI_APPS.every((app) => app.available)).toBe(true);
    expect(MINI_APPS.map((app) => app.id)).toEqual([
      'vitals-tracker',
      'medication-tracker',
      'checkup-planner',
      'period-tracker',
      'pregnancy-tracker',
      'immunization-tracker',
    ]);
    expect(MINI_APPS[0]?.id).toBe('vitals-tracker');
  });

  it('resolves labels through the translate function', () => {
    const t = (key: string) => `T:${key}`;
    expect(getMiniAppLabel('period-tracker', t)).toEqual({
      name: 'T:apps.registry.period-tracker.name',
      description: 'T:apps.registry.period-tracker.description',
    });
  });

  it('builds theme tones for every registered app', () => {
    for (const app of MINI_APPS) {
      const theme = getMiniAppTheme(app.id);
      expect(theme.id).toBe(app.id);
      expect(theme.titleColor).toMatch(/^#/);
      expect(theme.softEnd).toMatch(/^#/);
    }
  });

  it('throws for an unknown mini-app id', () => {
    expect(() => getMiniAppTheme('unknown-app' as never)).toThrow(/Unknown mini-app/);
  });
});

describe('mini-apps/_kit/i18n', () => {
  it('picks singular vs plural keys', () => {
    expect(pluralKey('apps.count', 1)).toBe('apps.count');
    expect(pluralKey('apps.count', 0)).toBe('apps.count_other');
    expect(pluralKey('apps.count', 2)).toBe('apps.count_other');
  });
});

describe('mini-apps/_kit/rehydrate-registry', () => {
  it('runs all registered rehydrators', async () => {
    const first = jest.fn(async () => undefined);
    const second = jest.fn(async () => undefined);
    registerMiniAppRehydrate(first);
    registerMiniAppRehydrate(second);
    await rehydrateAllMiniAppStores();
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});

describe('mini-apps/_kit/snapshot keys', () => {
  it('validates keys and builds snapshot ids', () => {
    expect(MINI_APP_KEYS).toHaveLength(6);
    expect(isMiniAppKey('vitals')).toBe(true);
    expect(isMiniAppKey('period')).toBe(true);
    expect(isMiniAppKey('nope')).toBe(false);
    expect(miniAppSnapshotId('user-1', 'vitals')).toBe('user-1:vitals');
    expect(MINI_APP_STORAGE_KEYS.vitals).toBe('caremate-vitals-tracker');
  });
});
