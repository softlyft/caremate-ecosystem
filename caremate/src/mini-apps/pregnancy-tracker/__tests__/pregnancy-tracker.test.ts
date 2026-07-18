import {
  MILESTONES,
  MOOD_OPTIONS,
  PREGNANCY_DAYS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import {
  localizeMilestone,
  localizeMilestones,
  localizeMood,
  localizeMoodOptions,
  localizePregnancyMilestone,
  localizeSymptom,
  localizeSymptomOptions,
  localizeTrimester,
} from '@/mini-apps/pregnancy-tracker/localize';
import { getTodayLog, usePregnancyTrackerStore } from '@/mini-apps/pregnancy-tracker/store';
import {
  calculateDueDateFromLmp,
  calculateLmpFromDueDate,
  formatDueDate,
  getDaysUntilDue,
  getGestationalAge,
  getTrimesterLabel,
  getUpcomingMilestones,
  toDateKey,
} from '@/mini-apps/pregnancy-tracker/utils';
import { parseDateKey } from '@/mini-apps/_kit/date-utils';
import { identityTranslate, mockCreateMemoryStorage } from '@/mini-apps/test-utils';

jest.mock('@/mini-apps/_kit/synced-storage', () => ({
  createMiniAppSyncedStorage: () => mockCreateMemoryStorage(),
}));

jest.mock('@/mini-apps/_kit/rehydrate-registry', () => ({
  registerMiniAppRehydrate: jest.fn(),
}));

describe('pregnancy-tracker/utils', () => {
  it('converts between LMP and due date with Naegele rule length', () => {
    const due = calculateDueDateFromLmp('2026-01-01');
    expect(due).toBe(toDateKey(new Date(2026, 0, 1 + PREGNANCY_DAYS)));
    expect(calculateLmpFromDueDate(due)).toBe('2026-01-01');
  });

  it('computes gestational age, trimesters, and progress', () => {
    expect(getGestationalAge(null)).toBeNull();
    const early = getGestationalAge('2026-01-01', parseDateKey('2026-01-15'));
    expect(early).toMatchObject({ totalDays: 14, weeks: 2, days: 0, trimester: 1 });
    expect(early!.progress).toBeCloseTo(14 / PREGNANCY_DAYS);

    const second = getGestationalAge('2026-01-01', parseDateKey('2026-04-16'));
    expect(second!.trimester).toBe(2);
    expect(second!.weeks).toBeGreaterThanOrEqual(14);

    const third = getGestationalAge('2026-01-01', parseDateKey('2026-07-16'));
    expect(third!.trimester).toBe(3);
    expect(third!.weeks).toBeGreaterThanOrEqual(28);
  });

  it('caps gestational days slightly past term', () => {
    const late = getGestationalAge('2026-01-01', parseDateKey('2027-01-01'));
    expect(late!.totalDays).toBe(PREGNANCY_DAYS + 14);
    expect(late!.progress).toBe(1);
  });

  it('reports days until due and formats due dates', () => {
    expect(getDaysUntilDue(null)).toBeNull();
    expect(getDaysUntilDue('2026-07-20', parseDateKey('2026-07-17'))).toBe(3);
    expect(formatDueDate('2026-07-17')).toContain('2026');
  });

  it('lists milestones with past/upcoming flags', () => {
    expect(getUpcomingMilestones(null)).toEqual([]);
    const items = getUpcomingMilestones('2026-01-01', parseDateKey('2026-03-01'));
    expect(items).toHaveLength(MILESTONES.length);
    expect(items.some((item) => item.isPast)).toBe(true);
    expect(items.some((item) => !item.isPast)).toBe(true);
  });

  it('labels trimesters', () => {
    expect(getTrimesterLabel(1)).toBe('First trimester');
    expect(getTrimesterLabel(2)).toBe('Second trimester');
    expect(getTrimesterLabel(3)).toBe('Third trimester');
  });
});

describe('pregnancy-tracker/localize', () => {
  const t = identityTranslate;

  it('localizes moods, symptoms, and options', () => {
    expect(localizeMood(MOOD_OPTIONS[0], t)).toContain('Happy');
    expect(localizeSymptom(SYMPTOM_OPTIONS[0], t)).toContain('Nausea');
    expect(localizeMoodOptions(t)).toHaveLength(MOOD_OPTIONS.length);
    expect(localizeSymptomOptions(t)).toHaveLength(SYMPTOM_OPTIONS.length);
  });

  it('localizes milestones and trimester keys', () => {
    const milestone = localizeMilestone(MILESTONES[0], t);
    expect(milestone.title).toContain('milestones.8.title');
    expect(localizeMilestones(t)).toHaveLength(MILESTONES.length);
    expect(
      localizePregnancyMilestone({ ...MILESTONES[0], daysUntil: 3, isPast: false }, t).daysUntil,
    ).toBe(3);
    expect(localizeTrimester(2, t)).toContain('trimester.2');
  });
});

describe('pregnancy-tracker/store', () => {
  beforeEach(() => {
    usePregnancyTrackerStore.getState().clearAll();
  });

  it('sets pregnancy from LMP or due date', () => {
    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-01-01');
    expect(usePregnancyTrackerStore.getState().lastMenstrualPeriod).toBe('2026-01-01');
    expect(usePregnancyTrackerStore.getState().dueDate).toBe(calculateDueDateFromLmp('2026-01-01'));

    usePregnancyTrackerStore.getState().setFromDueDate('2026-10-08');
    expect(usePregnancyTrackerStore.getState().dueDate).toBe('2026-10-08');
    expect(usePregnancyTrackerStore.getState().lastMenstrualPeriod).toBe(
      calculateLmpFromDueDate('2026-10-08'),
    );
  });

  it('stores nickname and daily logs', () => {
    usePregnancyTrackerStore.getState().setBabyNickname('Ada');
    const log = { ...getTodayLog('2026-07-17'), mood: 'Happy', kickCount: 4, notes: 'Active' };
    usePregnancyTrackerStore.getState().upsertDailyLog(log);
    expect(usePregnancyTrackerStore.getState().babyNickname).toBe('Ada');
    expect(usePregnancyTrackerStore.getState().dailyLogs['2026-07-17']).toMatchObject({
      kickCount: 4,
      mood: 'Happy',
    });
  });

  it('builds an empty today log template', () => {
    expect(getTodayLog('2026-07-17')).toEqual({
      dateKey: '2026-07-17',
      symptoms: [],
      kickCount: 0,
      notes: '',
    });
  });
});
