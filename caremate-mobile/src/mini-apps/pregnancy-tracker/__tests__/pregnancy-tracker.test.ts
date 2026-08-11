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
import { collectPregnancyAlerts } from '@/mini-apps/pregnancy-tracker/alerts';
import {
  getNextMaternalTtDoseId,
  isMaternalTt2Due,
  maternalTtSummary,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import {
  getTodayLog,
  listRecentDailyLogs,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
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
import {
  assessBirthDraft,
  assessMaternalTtDraft,
  assessPregnancyLogDraft,
  assessPregnancySetupDraft,
} from '@/mini-apps/pregnancy-tracker/validation';
import { usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import { parseDateKey } from '@/mini-apps/_kit/date-utils';
import { identityTranslate } from '@/mini-apps/test-utils';

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
    usePeriodTrackerStore.getState().clearAll();
  });

  it('sets pregnancy from LMP or due date', () => {
    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-01-01');
    const fromLmp = usePregnancyTrackerStore.getState();
    expect(fromLmp.lastMenstrualPeriod).toBe('2026-01-01');
    expect(fromLmp.dueDate).toBe(calculateDueDateFromLmp('2026-01-01'));
    expect(fromLmp.dueDateSource).toBe('lmp');
    expect(fromLmp.status).toBe('active');
    expect(fromLmp.pregnancyId).toBeTruthy();
    expect(fromLmp.hasCompletedSetup).toBe(true);

    usePregnancyTrackerStore.getState().setFromDueDate('2026-10-08');
    const fromDue = usePregnancyTrackerStore.getState();
    expect(fromDue.dueDate).toBe('2026-10-08');
    expect(fromDue.lastMenstrualPeriod).toBe(calculateLmpFromDueDate('2026-10-08'));
    expect(fromDue.dueDateSource).toBe('due-date');
    expect(fromDue.pregnancyId).toBe(fromLmp.pregnancyId);
  });

  it('auto-pauses the period tracker when pregnancy is set up', () => {
    usePeriodTrackerStore.getState().togglePeriodDay('2026-06-01');
    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-01-01');
    expect(usePeriodTrackerStore.getState().paused).toBe(true);
    expect(usePeriodTrackerStore.getState().pausedReason).toBe('pregnancy');
    expect(usePeriodTrackerStore.getState().loggedPeriodDays).toEqual(['2026-06-01']);
  });

  it('stores nickname and daily logs', () => {
    usePregnancyTrackerStore.getState().setBabyNickname('Ada');
    const log = {
      ...getTodayLog('2026-07-17'),
      mood: 'Happy',
      kickCount: 4,
      notes: 'Active',
      weightKg: 68.5,
    };
    usePregnancyTrackerStore.getState().upsertDailyLog(log);
    expect(usePregnancyTrackerStore.getState().babyNickname).toBe('Ada');
    expect(usePregnancyTrackerStore.getState().dailyLogs['2026-07-17']).toMatchObject({
      kickCount: 4,
      mood: 'Happy',
      weightKg: 68.5,
    });
  });

  it('archives and clears on endPregnancy, resumes period tracker', () => {
    usePeriodTrackerStore.getState().togglePeriodDay('2026-06-01');
    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-01-01');
    usePregnancyTrackerStore.getState().setBabyNickname('Ada');
    usePregnancyTrackerStore.getState().upsertDailyLog({
      ...getTodayLog('2026-07-17'),
      kickCount: 2,
      notes: 'ok',
    });
    usePregnancyTrackerStore.getState().logMaternalTtDose('tt1', '2026-02-01');

    usePregnancyTrackerStore.getState().endPregnancy();
    const ended = usePregnancyTrackerStore.getState();
    expect(ended.status).toBe('ended');
    expect(ended.lastMenstrualPeriod).toBeNull();
    expect(ended.dueDate).toBeNull();
    expect(ended.dailyLogs).toEqual({});
    expect(ended.hasCompletedSetup).toBe(false);
    expect(ended.pastPregnancies).toHaveLength(1);
    expect(ended.pastPregnancies[0]).toMatchObject({
      babyNickname: 'Ada',
      logCount: 1,
      dueDateSource: 'lmp',
      outcome: 'closed',
    });
    expect(ended.maternalTtDoses).toEqual([{ id: 'tt1', dateKey: '2026-02-01' }]);
    expect(usePeriodTrackerStore.getState().paused).toBe(false);

    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-08-01');
    const next = usePregnancyTrackerStore.getState();
    expect(next.status).toBe('active');
    expect(next.pregnancyId).not.toBe(ended.pastPregnancies[0].id);
    expect(next.dailyLogs).toEqual({});
    expect(next.maternalTtDoses).toEqual([{ id: 'tt1', dateKey: '2026-02-01' }]);
  });

  it('enters postpartum on recordBirth and archives on finishPostpartum', () => {
    usePeriodTrackerStore.getState().togglePeriodDay('2026-06-01');
    usePregnancyTrackerStore.getState().setFromLastPeriod('2026-01-01');
    usePregnancyTrackerStore.getState().setBabyNickname('Ada');
    usePregnancyTrackerStore.getState().logMaternalTtDose('tt1', '2026-02-01');

    usePregnancyTrackerStore.getState().recordBirth('2026-10-01');
    const postpartum = usePregnancyTrackerStore.getState();
    expect(postpartum.status).toBe('postpartum');
    expect(postpartum.birthDate).toBe('2026-10-01');
    expect(postpartum.lastMenstrualPeriod).toBe('2026-01-01');
    expect(usePeriodTrackerStore.getState().paused).toBe(true);

    usePregnancyTrackerStore.getState().finishPostpartum();
    const finished = usePregnancyTrackerStore.getState();
    expect(finished.status).toBe('ended');
    expect(finished.birthDate).toBeNull();
    expect(finished.pastPregnancies[0]).toMatchObject({
      outcome: 'birth',
      birthDate: '2026-10-01',
      babyNickname: 'Ada',
    });
    expect(finished.maternalTtDoses).toEqual([{ id: 'tt1', dateKey: '2026-02-01' }]);
    expect(usePeriodTrackerStore.getState().paused).toBe(false);
  });

  it('logs maternal TT doses in order and can remove them', () => {
    usePregnancyTrackerStore.getState().logMaternalTtDose('tt1', '2026-01-10');
    usePregnancyTrackerStore.getState().logMaternalTtDose('tt2', '2026-02-15');
    expect(getNextMaternalTtDoseId(usePregnancyTrackerStore.getState().maternalTtDoses)).toBe(
      'tt3',
    );
    expect(maternalTtSummary(usePregnancyTrackerStore.getState().maternalTtDoses)).toMatchObject({
      completed: 2,
      total: 5,
      next: 'tt3',
    });
    usePregnancyTrackerStore.getState().removeMaternalTtDose('tt2');
    expect(getNextMaternalTtDoseId(usePregnancyTrackerStore.getState().maternalTtDoses)).toBe(
      'tt2',
    );
  });

  it('lists recent daily logs newest-first', () => {
    usePregnancyTrackerStore
      .getState()
      .upsertDailyLog({ ...getTodayLog('2026-07-10'), notes: 'a' });
    usePregnancyTrackerStore
      .getState()
      .upsertDailyLog({ ...getTodayLog('2026-07-17'), notes: 'b' });
    const recent = listRecentDailyLogs(usePregnancyTrackerStore.getState().dailyLogs, 2);
    expect(recent.map((log) => log.dateKey)).toEqual(['2026-07-17', '2026-07-10']);
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

describe('pregnancy-tracker/alerts', () => {
  it('collects due, milestone, and daily nudge candidates', () => {
    const due = calculateDueDateFromLmp('2026-01-01');
    const candidates = collectPregnancyAlerts({
      lastMenstrualPeriod: '2026-01-01',
      dueDate: due,
      babyNickname: 'Ada',
      hasTodayLog: false,
      status: 'active',
      now: parseDateKey(due),
    });
    expect(candidates.some((c) => c.eventType === 'due_today')).toBe(true);
    expect(candidates.some((c) => c.eventType === 'daily_log_nudge')).toBe(true);
  });

  it('skips pregnancy timeline alerts when ended or postpartum but keeps TT nudge', () => {
    const endedOnly = collectPregnancyAlerts({
      lastMenstrualPeriod: '2026-01-01',
      dueDate: '2026-10-08',
      babyNickname: 'Ada',
      hasTodayLog: false,
      status: 'ended',
    });
    expect(endedOnly).toHaveLength(0);

    const postpartumOnly = collectPregnancyAlerts({
      lastMenstrualPeriod: '2026-01-01',
      dueDate: '2026-10-08',
      babyNickname: 'Ada',
      hasTodayLog: false,
      status: 'postpartum',
    });
    expect(postpartumOnly).toHaveLength(0);

    const withTt = collectPregnancyAlerts({
      lastMenstrualPeriod: null,
      dueDate: null,
      babyNickname: 'Baby',
      hasTodayLog: false,
      status: 'postpartum',
      maternalTtDoses: [{ id: 'tt1', dateKey: '2026-01-01' }],
      now: parseDateKey('2026-02-15'),
    });
    expect(withTt.some((c) => c.eventType === 'tt_dose_due')).toBe(true);
  });
});

describe('pregnancy-tracker/maternal-tt', () => {
  it('detects TT2 due after 28 days', () => {
    expect(isMaternalTt2Due([{ id: 'tt1', dateKey: '2026-01-01' }], '2026-01-20')).toBe(false);
    expect(isMaternalTt2Due([{ id: 'tt1', dateKey: '2026-01-01' }], '2026-01-29')).toBe(true);
    expect(
      isMaternalTt2Due(
        [
          { id: 'tt1', dateKey: '2026-01-01' },
          { id: 'tt2', dateKey: '2026-02-01' },
        ],
        '2026-03-01',
      ),
    ).toBe(false);
  });
});

describe('pregnancy-tracker/validation', () => {
  it('hard-blocks missing date and future LMP', () => {
    expect(
      assessPregnancySetupDraft({
        mode: 'lmp',
        selectedDate: null,
        babyNickname: 'Baby',
        todayKey: '2026-07-16',
        periodTrackerActive: false,
      }).hard?.code,
    ).toBe('required_date');

    expect(
      assessPregnancySetupDraft({
        mode: 'lmp',
        selectedDate: '2026-08-01',
        babyNickname: 'Baby',
        todayKey: '2026-07-16',
        periodTrackerActive: false,
      }).hard?.code,
    ).toBe('lmp_future');
  });

  it('soft-warns past-term LMP and period pause', () => {
    const past = assessPregnancySetupDraft({
      mode: 'lmp',
      selectedDate: '2025-01-01',
      babyNickname: 'Ada',
      todayKey: '2026-07-16',
      periodTrackerActive: true,
    });
    expect(past.hard).toBeNull();
    expect(past.soft.some((s) => s.code === 'soft_past_term')).toBe(true);
    expect(past.soft.some((s) => s.code === 'soft_will_pause_period')).toBe(true);
  });

  it('soft-warns high kicks and empty logs', () => {
    const kicks = assessPregnancyLogDraft({
      dateKey: '2026-07-16',
      symptoms: [],
      kickCount: 80,
      notes: '',
    });
    expect(kicks.soft.some((s) => s.code === 'soft_kicks_high')).toBe(true);

    const empty = assessPregnancyLogDraft({
      dateKey: '2026-07-16',
      symptoms: [],
      kickCount: 0,
      notes: '  ',
    });
    expect(empty.soft.some((s) => s.code === 'soft_empty_log')).toBe(true);
  });

  it('soft-warns unusual weight and keeps valid weight in payload', () => {
    const unusual = assessPregnancyLogDraft({
      dateKey: '2026-07-16',
      symptoms: [],
      kickCount: 0,
      notes: '',
      weightKg: 20,
    });
    expect(unusual.soft.some((s) => s.code === 'soft_weight_unusual')).toBe(true);

    const ok = assessPregnancyLogDraft({
      dateKey: '2026-07-16',
      symptoms: [],
      kickCount: 1,
      notes: '',
      weightKg: 70.25,
    });
    expect(ok.hard).toBeNull();
    expect(ok.payload?.weightKg).toBe(70.3);
  });

  it('soft-warns overwrite and start-after-ended setup', () => {
    const overwrite = assessPregnancySetupDraft({
      mode: 'lmp',
      selectedDate: '2026-01-01',
      babyNickname: 'Baby',
      todayKey: '2026-07-16',
      periodTrackerActive: false,
      hasActiveTimeline: true,
    });
    expect(overwrite.soft.some((s) => s.code === 'soft_overwrite_timeline')).toBe(true);

    const afterEnded = assessPregnancySetupDraft({
      mode: 'due-date',
      selectedDate: '2026-12-01',
      babyNickname: 'Baby',
      todayKey: '2026-07-16',
      periodTrackerActive: false,
      previouslyEnded: true,
    });
    expect(afterEnded.soft.some((s) => s.code === 'soft_start_new_after_ended')).toBe(true);
  });

  it('validates maternal TT dose order and interval', () => {
    expect(
      assessMaternalTtDraft({
        doseId: 'tt2',
        selectedDate: '2026-02-01',
        todayKey: '2026-07-16',
        existingDoses: [],
      }).hard?.code,
    ).toBe('tt_out_of_order');

    expect(
      assessMaternalTtDraft({
        doseId: 'tt1',
        selectedDate: '2026-08-01',
        todayKey: '2026-07-16',
        existingDoses: [],
      }).hard?.code,
    ).toBe('tt_future');

    const softInterval = assessMaternalTtDraft({
      doseId: 'tt2',
      selectedDate: '2026-01-10',
      todayKey: '2026-07-16',
      existingDoses: [{ id: 'tt1', dateKey: '2026-01-01' }],
    });
    expect(softInterval.hard).toBeNull();
    expect(softInterval.soft.some((s) => s.code === 'soft_tt_interval')).toBe(true);
  });

  it('validates birth date and blocks setup during postpartum', () => {
    expect(
      assessBirthDraft({
        selectedDate: '2026-08-01',
        todayKey: '2026-07-16',
        lastMenstrualPeriod: '2026-01-01',
      }).hard?.code,
    ).toBe('birth_future');

    expect(
      assessPregnancySetupDraft({
        mode: 'lmp',
        selectedDate: '2026-01-01',
        babyNickname: 'Baby',
        todayKey: '2026-07-16',
        periodTrackerActive: false,
        isPostpartum: true,
      }).hard?.code,
    ).toBe('setup_blocked_postpartum');
  });
});
