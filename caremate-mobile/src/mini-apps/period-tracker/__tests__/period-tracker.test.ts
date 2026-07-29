import {
  addDays,
  daysBetween,
  getCycleDay,
  getMonthMatrix,
  getWeekStrip,
  parseDateKey,
  predictNextPeriodStart,
  startOfDay,
  toDateKey,
} from '@/mini-apps/period-tracker/utils';
import {
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  clampCycleLength,
  deriveLastPeriodStart,
  deriveLatestPeriodStreak,
  isPredictedPeriodDay,
  usePeriodTrackerStore,
} from '@/mini-apps/period-tracker/store';

describe('period-tracker/utils', () => {
  it('handles date key math', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(addDays(parseDateKey('2026-01-05'), 2))).toBe('2026-01-07');
    expect(daysBetween(parseDateKey('2026-01-05'), parseDateKey('2026-01-10'))).toBe(5);
    expect(startOfDay(new Date(2026, 0, 5, 18)).getHours()).toBe(0);
  });

  it('builds month matrix and week strip', () => {
    const matrix = getMonthMatrix(new Date(2026, 1, 1));
    expect(matrix.length % 7).toBe(0);
    const week = getWeekStrip(parseDateKey('2026-07-17'));
    expect(week).toHaveLength(7);
    expect(toDateKey(week[3]!)).toBe('2026-07-17');
  });

  it('predicts next period and cycle day', () => {
    expect(predictNextPeriodStart(null, 28)).toBeNull();
    expect(toDateKey(predictNextPeriodStart('2026-07-01', 28)!)).toBe('2026-07-29');
    expect(getCycleDay(null)).toBeNull();
    expect(getCycleDay('2026-07-10', parseDateKey('2026-07-17'))).toBe(8);
    expect(getCycleDay('2026-07-20', parseDateKey('2026-07-17'))).toBeNull();
  });
});

describe('period-tracker/deriveLastPeriodStart', () => {
  it('returns null for empty logs', () => {
    expect(deriveLastPeriodStart([])).toBeNull();
  });

  it('uses the start of the most recent contiguous streak', () => {
    expect(
      deriveLastPeriodStart(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-29', '2026-01-30']),
    ).toBe('2026-01-29');
  });

  it('treats a single day as its own streak start', () => {
    expect(deriveLastPeriodStart(['2026-03-15'])).toBe('2026-03-15');
  });
});

describe('period-tracker/deriveLatestPeriodStreak', () => {
  it('returns null for empty logs', () => {
    expect(deriveLatestPeriodStreak([])).toBeNull();
  });

  it('counts the length of the most recent contiguous streak', () => {
    expect(
      deriveLatestPeriodStreak(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-29', '2026-01-30']),
    ).toEqual({ start: '2026-01-29', length: 2 });
    expect(deriveLatestPeriodStreak(['2026-07-01', '2026-07-02', '2026-07-03'])).toEqual({
      start: '2026-07-01',
      length: 3,
    });
  });
});

describe('period-tracker/isPredictedPeriodDay', () => {
  it('marks days in the predicted window and skips logged days', () => {
    expect(isPredictedPeriodDay('2026-07-29', '2026-07-01', 28, 5, [])).toBe(true);
    expect(isPredictedPeriodDay('2026-08-02', '2026-07-01', 28, 5, [])).toBe(true);
    expect(isPredictedPeriodDay('2026-08-03', '2026-07-01', 28, 5, [])).toBe(false);
    expect(isPredictedPeriodDay('2026-07-29', '2026-07-01', 28, 5, ['2026-07-29'])).toBe(false);
    expect(isPredictedPeriodDay('2026-07-29', null, 28, 5, [])).toBe(false);
  });

  it('returns false when tracking is paused', () => {
    expect(isPredictedPeriodDay('2026-07-29', '2026-07-01', 28, 5, [], true)).toBe(false);
  });
});

describe('period-tracker/clampCycleLength', () => {
  it('clamps to 21–45 and rounds', () => {
    expect(clampCycleLength(20)).toBe(CYCLE_LENGTH_MIN);
    expect(clampCycleLength(46)).toBe(CYCLE_LENGTH_MAX);
    expect(clampCycleLength(25.6)).toBe(26);
    expect(clampCycleLength(Number.NaN)).toBe(28);
  });
});

describe('period-tracker/store', () => {
  beforeEach(() => {
    usePeriodTrackerStore.getState().clearAll();
    usePeriodTrackerStore.setState({ cycleLength: 28, periodLength: 5 });
  });

  it('clamps setCycleLength to 21–45', () => {
    usePeriodTrackerStore.getState().setCycleLength(18);
    expect(usePeriodTrackerStore.getState().cycleLength).toBe(CYCLE_LENGTH_MIN);
    usePeriodTrackerStore.getState().setCycleLength(50);
    expect(usePeriodTrackerStore.getState().cycleLength).toBe(CYCLE_LENGTH_MAX);
    usePeriodTrackerStore.getState().setCycleLength(26);
    expect(usePeriodTrackerStore.getState().cycleLength).toBe(26);
  });

  it('updates cycle settings and toggles logged days', () => {
    const store = usePeriodTrackerStore.getState();
    store.setCycleLength(30);
    store.setPeriodLength(4);
    store.togglePeriodDay('2026-07-01');
    store.togglePeriodDay('2026-07-02');
    expect(usePeriodTrackerStore.getState().cycleLength).toBe(30);
    // Latest streak is 2 contiguous days — period length follows the log.
    expect(usePeriodTrackerStore.getState().periodLength).toBe(2);
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual(['2026-07-01', '2026-07-02']);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBe('2026-07-01');

    store.togglePeriodDay('2026-07-01');
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual(['2026-07-02']);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBe('2026-07-02');
    expect(usePeriodTrackerStore.getState().periodLength).toBe(1);
  });

  it('sets periodLength from a 3-day logged streak (cycle summary)', () => {
    const store = usePeriodTrackerStore.getState();
    store.togglePeriodDay('2026-07-10');
    store.togglePeriodDay('2026-07-11');
    store.togglePeriodDay('2026-07-12');
    expect(usePeriodTrackerStore.getState().periodLength).toBe(3);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBe('2026-07-10');
  });

  it('keeps prior periodLength when logs are cleared', () => {
    usePeriodTrackerStore.getState().setLoggedPeriodDays(['2026-07-01', '2026-07-02', '2026-07-03']);
    expect(usePeriodTrackerStore.getState().periodLength).toBe(3);
    usePeriodTrackerStore.getState().setLoggedPeriodDays([]);
    expect(usePeriodTrackerStore.getState().periodLength).toBe(3);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBeNull();
  });

  it('derives lastPeriodStart from the latest streak when replacing the full log', () => {
    usePeriodTrackerStore
      .getState()
      .setLoggedPeriodDays(['2026-01-01', '2026-01-02', '2026-02-01', '2026-02-02']);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBe('2026-02-01');
  });

  it('clears logged days and pause state', () => {
    usePeriodTrackerStore.getState().setLoggedPeriodDays(['2026-07-01']);
    usePeriodTrackerStore.getState().pauseForPregnancy();
    usePeriodTrackerStore.getState().clearAll();
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual([]);
    expect(usePeriodTrackerStore.getState().lastPeriodStart).toBeNull();
    expect(usePeriodTrackerStore.getState().paused).toBe(false);
    expect(usePeriodTrackerStore.getState().pausedReason).toBeNull();
  });

  it('pauses for pregnancy, blocks toggles, and can resume', () => {
    usePeriodTrackerStore.getState().togglePeriodDay('2026-07-01');
    usePeriodTrackerStore.getState().pauseForPregnancy();
    expect(usePeriodTrackerStore.getState().paused).toBe(true);
    expect(usePeriodTrackerStore.getState().pausedReason).toBe('pregnancy');

    usePeriodTrackerStore.getState().togglePeriodDay('2026-07-02');
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual(['2026-07-01']);

    usePeriodTrackerStore.getState().resume();
    expect(usePeriodTrackerStore.getState().paused).toBe(false);
    usePeriodTrackerStore.getState().togglePeriodDay('2026-07-02');
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual(['2026-07-01', '2026-07-02']);
  });
});
