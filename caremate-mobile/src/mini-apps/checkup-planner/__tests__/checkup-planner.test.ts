import {
  CHECKUP_CATALOG,
  getCadenceIntervalYears,
  getCadenceLabel,
  GENDER_OPTIONS,
} from '@/mini-apps/checkup-planner/constants';
import {
  localizeCadence,
  localizeCheckup,
  localizeCheckupDescription,
  localizeCheckupName,
  localizeCheckupStatus,
  localizeGender,
  localizeGenderOptions,
} from '@/mini-apps/checkup-planner/localize';
import { useCheckupPlannerStore } from '@/mini-apps/checkup-planner/store';
import {
  buildYearSchedule,
  formatDisplayDate,
  getAgeInYear,
  getAgeOnDate,
  getStatusLabel,
  getYearSummary,
  resolvePlannerRegion,
  type CheckupPlannerProfile,
} from '@/mini-apps/checkup-planner/utils';
import { identityTranslate } from '@/mini-apps/test-utils';

const adultFemale: CheckupPlannerProfile = {
  dateOfBirth: '1985-06-15',
  gender: 'female',
  regionCode: 'NG',
};

describe('checkup-planner/constants', () => {
  it('maps cadence labels and intervals', () => {
    expect(getCadenceLabel('annual')).toBe('Every year');
    expect(getCadenceLabel('once')).toBe('Once (when due)');
    expect(getCadenceLabel('every-2-years')).toBe('Every 2 years');
    expect(getCadenceLabel('every-3-years')).toBe('Every 3 years');
    expect(getCadenceLabel('every-5-years')).toBe('Every 5 years');
    expect(getCadenceIntervalYears('annual')).toBe(1);
    expect(getCadenceIntervalYears('once')).toBe(0);
    expect(getCadenceIntervalYears('every-2-years')).toBe(2);
    expect(getCadenceIntervalYears('every-3-years')).toBe(3);
    expect(getCadenceIntervalYears('every-5-years')).toBe(5);
    expect(CHECKUP_CATALOG.length).toBeGreaterThan(10);
    expect(GENDER_OPTIONS).toHaveLength(3);
  });
});

describe('checkup-planner/utils', () => {
  it('computes age and region defaults', () => {
    expect(getAgeOnDate('2000-07-20', new Date(2026, 6, 19))).toBe(25);
    expect(getAgeOnDate('2000-07-20', new Date(2026, 6, 20))).toBe(26);
    expect(getAgeInYear('2000-01-01', 2026)).toBe(26);
    expect(resolvePlannerRegion(null)).toBe('INT');
    expect(resolvePlannerRegion(' ng ')).toBe('NG');
    expect(formatDisplayDate('2026-07-17')).toContain('2026');
  });

  it('builds a gendered regional schedule for the current year', () => {
    const year = new Date().getFullYear();
    const schedule = buildYearSchedule(adultFemale, [], year);
    expect(schedule.some((item) => item.checkup.id === 'cervical-screening')).toBe(true);
    expect(schedule.some((item) => item.checkup.id === 'prostate-discussion')).toBe(false);
    expect(schedule.some((item) => item.checkup.id === 'general-checkup')).toBe(true);
    expect(
      schedule.every((item) => ['due', 'upcoming', 'overdue', 'completed'].includes(item.status)),
    ).toBe(true);
  });

  it('marks completions and respects multi-year cadence', () => {
    const year = new Date().getFullYear();
    const withDone = buildYearSchedule(
      adultFemale,
      [
        {
          checkupId: 'general-checkup',
          year,
          completedDate: `${year}-03-01`,
        },
        {
          checkupId: 'eye-exam',
          year: year - 1,
          completedDate: `${year - 1}-03-01`,
        },
      ],
      year,
    );
    expect(withDone.find((item) => item.checkup.id === 'general-checkup')!.status).toBe(
      'completed',
    );
    // Eye exam is every 2 years; completed last year → not due this year.
    expect(withDone.find((item) => item.checkup.id === 'eye-exam')).toBeUndefined();
  });

  it('shows overdue items for past years and upcoming for future years', () => {
    const past = buildYearSchedule(adultFemale, [], new Date().getFullYear() - 1);
    expect(past.some((item) => item.status === 'overdue')).toBe(true);

    const future = buildYearSchedule(adultFemale, [], new Date().getFullYear() + 1);
    expect(future.every((item) => item.status === 'upcoming' || item.status === 'completed')).toBe(
      true,
    );
  });

  it('hides region-specific tips on INT and shows them for matching countries', () => {
    const year = new Date().getFullYear();
    const maleNg: CheckupPlannerProfile = {
      dateOfBirth: '1978-01-01',
      gender: 'male',
      regionCode: 'NG',
    };
    const maleInt: CheckupPlannerProfile = { ...maleNg, regionCode: null };
    const ngSchedule = buildYearSchedule(maleNg, [], year);
    const intSchedule = buildYearSchedule(maleInt, [], year);
    expect(ngSchedule.some((item) => item.checkup.id === 'prostate-earlier')).toBe(true);
    expect(intSchedule.some((item) => item.checkup.id === 'prostate-earlier')).toBe(false);
  });

  it('shows sex-specific items for other gender and once-cadence bone density', () => {
    const year = new Date().getFullYear();
    const other: CheckupPlannerProfile = {
      dateOfBirth: '1955-01-01',
      gender: 'other',
      regionCode: 'US',
    };
    const schedule = buildYearSchedule(other, [], year);
    expect(schedule.some((item) => item.checkup.gender === 'female')).toBe(true);
    expect(schedule.some((item) => item.checkup.gender === 'male')).toBe(true);

    const withBoneDone = buildYearSchedule(
      other,
      [{ checkupId: 'bone-density-women', year: year - 2, completedDate: `${year - 2}-01-01` }],
      year,
    );
    expect(withBoneDone.find((item) => item.checkup.id === 'bone-density-women')).toBeUndefined();
  });

  it('summarizes year progress and status labels', () => {
    const year = new Date().getFullYear();
    const items = buildYearSchedule(
      adultFemale,
      [{ checkupId: 'general-checkup', year, completedDate: `${year}-01-01` }],
      year,
    );
    const summary = getYearSummary(items);
    expect(summary.completed).toBeGreaterThanOrEqual(1);
    expect(summary.total).toBe(items.length);
    expect(summary.progress).toBeGreaterThan(0);
    expect(getStatusLabel('completed')).toBe('Done');
    expect(getStatusLabel('due')).toBe('Due');
    expect(getStatusLabel('overdue')).toBe('Overdue');
    expect(getStatusLabel('upcoming')).toBe('Upcoming');
  });
});

describe('checkup-planner/localize', () => {
  const t = identityTranslate;

  it('localizes catalog copy, cadence, gender, and status', () => {
    const checkup = CHECKUP_CATALOG[0]!;
    expect(localizeCheckupName(checkup.id, t, checkup.name)).toContain(checkup.id);
    expect(localizeCheckupDescription(checkup.id, t, checkup.description)).toContain(checkup.id);
    expect(localizeCheckup(checkup, t).name).toContain(checkup.id);
    expect(localizeCadence('annual', t)).toContain('cadence.annual');
    expect(localizeGender('female', t)).toContain('gender.female');
    expect(localizeGenderOptions(t)).toHaveLength(GENDER_OPTIONS.length);
    expect(localizeCheckupStatus('due', t)).toContain('status.due');
  });
});

describe('checkup-planner/store', () => {
  beforeEach(() => {
    useCheckupPlannerStore.getState().clearAll();
  });

  it('saves profile, marks completions, and clears state', () => {
    useCheckupPlannerStore.getState().saveProfile({
      dateOfBirth: '1990-01-01',
      gender: 'male',
      regionCode: ' ke ',
    });
    expect(useCheckupPlannerStore.getState().profile).toEqual({
      dateOfBirth: '1990-01-01',
      gender: 'male',
      regionCode: 'KE',
    });

    useCheckupPlannerStore.getState().markComplete({
      checkupId: 'general-checkup',
      year: 2026,
      completedDate: '2026-03-01',
      notes: ' clinic ',
    });
    expect(useCheckupPlannerStore.getState().completions[0]).toMatchObject({
      checkupId: 'general-checkup',
      notes: 'clinic',
    });

    useCheckupPlannerStore.getState().markComplete({
      checkupId: 'general-checkup',
      year: 2026,
      completedDate: '2026-04-01',
    });
    expect(useCheckupPlannerStore.getState().completions).toHaveLength(1);
    expect(useCheckupPlannerStore.getState().completions[0]!.completedDate).toBe('2026-04-01');

    useCheckupPlannerStore.getState().removeCompletion('general-checkup', 2026);
    expect(useCheckupPlannerStore.getState().completions).toHaveLength(0);

    useCheckupPlannerStore.getState().clearProfile();
    expect(useCheckupPlannerStore.getState().profile).toBeNull();
  });
});
