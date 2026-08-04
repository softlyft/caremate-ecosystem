import { VACCINE_SCHEDULE } from '@/mini-apps/immunization-tracker/constants';
import { resolveFamilyImmunizationSource } from '@/mini-apps/immunization-tracker/family-source';
import { localizeVaccine, localizeVaccineStatus } from '@/mini-apps/immunization-tracker/localize';
import {
  migratePersistedState,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import {
  buildSchedule,
  formatDisplayDate,
  getAgeLabel,
  getRecommendedDate,
  getScheduleSummary,
  getStatusLabel,
  type ImmunizationProfile,
  type ImmunizationRecord,
} from '@/mini-apps/immunization-tracker/utils';
import {
  assessImmunizationRecordDraft,
  getPriorDosesInSeries,
} from '@/mini-apps/immunization-tracker/validation';
import { parseDateKey } from '@/mini-apps/_kit/date-utils';
import { identityTranslate } from '@/mini-apps/test-utils';

const profile: ImmunizationProfile = {
  id: 'child-1',
  name: 'Ada',
  dateOfBirth: '2026-01-01',
};

describe('immunization-tracker/utils', () => {
  const today = parseDateKey('2026-03-01');

  it('computes recommended dates and age labels', () => {
    expect(getRecommendedDate('2026-01-01', 0)).toBe('2026-01-01');
    expect(getRecommendedDate('2026-01-01', 6)).toBe('2026-02-12');
    expect(formatDisplayDate('2026-01-01')).toContain('2026');
    expect(getAgeLabel('2026-02-20', today)).toMatch(/week/);
    expect(getAgeLabel('2026-01-01', today)).toMatch(/month/);
    expect(getAgeLabel('2020-01-01', today)).toMatch(/y|years/);
    expect(getAgeLabel('2025-06-01', today)).toMatch(/month/);
  });

  it('builds schedule statuses and summary', () => {
    const records: ImmunizationRecord[] = [
      {
        profileId: profile.id,
        vaccineId: 'bcg',
        administeredDate: '2026-01-02',
      },
    ];
    const schedule = buildSchedule(profile, records, today);
    expect(schedule).toHaveLength(VACCINE_SCHEDULE.length);
    expect(schedule.find((item) => item.vaccine.id === 'bcg')!.status).toBe('completed');
    expect(schedule.some((item) => item.status === 'overdue')).toBe(true);
    expect(schedule.some((item) => item.status === 'upcoming' || item.status === 'due-soon')).toBe(
      true,
    );

    const summary = getScheduleSummary(schedule);
    expect(summary.completed).toBe(1);
    expect(summary.total).toBe(VACCINE_SCHEDULE.length);
    expect(summary.progress).toBeCloseTo(1 / VACCINE_SCHEDULE.length);
    expect(summary.nextDue).toBeDefined();
  });

  it('labels vaccine statuses', () => {
    expect(getStatusLabel('completed')).toBe('Completed');
    expect(getStatusLabel('overdue')).toBe('Overdue');
    expect(getStatusLabel('due-soon')).toBe('Due soon');
    expect(getStatusLabel('upcoming')).toBe('Upcoming');
  });

  it('marks vaccines due within 14 days as due-soon', () => {
    // Week-6 vaccines land 42 days after birth; choose DOB so that is 10 days ahead.
    const reference = parseDateKey('2026-03-01');
    const dateOfBirth = '2026-01-28'; // +42 days => 2026-03-11
    const schedule = buildSchedule({ ...profile, dateOfBirth }, [], reference);
    const dueSoon = schedule.filter((item) => item.status === 'due-soon');
    expect(dueSoon.length).toBeGreaterThan(0);
    expect(dueSoon.every((item) => item.daysUntilDue >= 0 && item.daysUntilDue <= 14)).toBe(true);
  });
});

describe('immunization-tracker/localize', () => {
  it('localizes vaccine copy and status', () => {
    const localized = localizeVaccine(VACCINE_SCHEDULE[0]!, identityTranslate);
    expect(localized.name).toContain('schedule.bcg.name');
    expect(localizeVaccineStatus('overdue', identityTranslate)).toContain('status.overdue');
  });
});

describe('immunization-tracker/family-source', () => {
  it('resolves all source states', () => {
    expect(
      resolveFamilyImmunizationSource({
        isGuest: true,
        hydrated: true,
        householdLoading: false,
        childrenLoading: false,
        householdId: null,
        children: [],
      }).status,
    ).toBe('guest');

    expect(
      resolveFamilyImmunizationSource({
        isGuest: false,
        hydrated: false,
        householdLoading: false,
        childrenLoading: false,
        householdId: 'hh',
        children: [profile],
      }).status,
    ).toBe('loading');

    expect(
      resolveFamilyImmunizationSource({
        isGuest: false,
        hydrated: true,
        householdLoading: false,
        childrenLoading: false,
        householdId: null,
        children: [],
      }).status,
    ).toBe('needs_family_setup');

    expect(
      resolveFamilyImmunizationSource({
        isGuest: false,
        hydrated: true,
        householdLoading: false,
        childrenLoading: false,
        householdId: 'hh',
        children: [],
      }).status,
    ).toBe('needs_children');

    expect(
      resolveFamilyImmunizationSource({
        isGuest: false,
        hydrated: true,
        householdLoading: false,
        childrenLoading: false,
        householdId: 'hh',
        children: [profile],
      }),
    ).toEqual({ status: 'ready', children: [profile] });
  });
});

describe('immunization-tracker/migratePersistedState', () => {
  it('keeps multi-profile state and repairs active id', () => {
    const migrated = migratePersistedState({
      profiles: [profile],
      activeProfileId: 'missing',
      records: [{ profileId: profile.id, vaccineId: 'bcg', administeredDate: '2026-01-02' }],
    });
    expect(migrated.activeProfileId).toBe(profile.id);
    expect(migrated.records).toHaveLength(1);
  });

  it('migrates legacy single profile payloads', () => {
    const migrated = migratePersistedState({
      profile: { name: 'Ada', dateOfBirth: '2026-01-01' },
      records: [{ vaccineId: 'bcg', administeredDate: '2026-01-02' }],
    });
    expect(migrated.profiles).toHaveLength(1);
    expect(migrated.records![0]!.profileId).toBe(migrated.profiles![0]!.id);
  });

  it('returns empty state for blank payloads', () => {
    expect(migratePersistedState(null)).toEqual({
      profiles: [],
      activeProfileId: null,
      records: [],
    });
  });

  it('drops legacy records without a profile id when there is no active profile', () => {
    const migrated = migratePersistedState({
      profiles: [],
      records: [{ vaccineId: 'bcg', administeredDate: '2026-01-02' }],
    });
    expect(migrated.records).toEqual([]);
  });
});

describe('immunization-tracker/store', () => {
  beforeEach(() => {
    useImmunizationTrackerStore.getState().clearAll();
  });

  it('syncs family children and preserves a still-valid active profile', () => {
    useImmunizationTrackerStore.getState().syncProfilesFromFamily([profile]);
    expect(useImmunizationTrackerStore.getState().activeProfileId).toBe(profile.id);

    const second = { id: 'child-2', name: 'Ben', dateOfBirth: '2025-01-01' };
    useImmunizationTrackerStore.getState().syncProfilesFromFamily([profile, second]);
    expect(useImmunizationTrackerStore.getState().activeProfileId).toBe(profile.id);

    useImmunizationTrackerStore.getState().setActiveProfileId(second.id);
    expect(useImmunizationTrackerStore.getState().activeProfileId).toBe(second.id);
    useImmunizationTrackerStore.getState().setActiveProfileId('missing');
    expect(useImmunizationTrackerStore.getState().activeProfileId).toBe(second.id);

    useImmunizationTrackerStore
      .getState()
      .syncProfilesFromFamily([{ id: 'child-3', name: 'NoDob', dateOfBirth: '   ' }, second]);
    expect(useImmunizationTrackerStore.getState().profiles).toEqual([second]);
    expect(useImmunizationTrackerStore.getState().activeProfileId).toBe(second.id);
  });

  it('upserts and removes vaccine records', () => {
    useImmunizationTrackerStore.getState().syncProfilesFromFamily([profile]);
    useImmunizationTrackerStore.getState().upsertRecord({
      profileId: profile.id,
      vaccineId: 'bcg',
      administeredDate: '2026-01-02',
      notes: 'clinic',
    });
    useImmunizationTrackerStore.getState().upsertRecord({
      profileId: profile.id,
      vaccineId: 'bcg',
      administeredDate: '2026-01-03',
    });
    expect(useImmunizationTrackerStore.getState().records).toHaveLength(1);
    expect(useImmunizationTrackerStore.getState().records[0]!.administeredDate).toBe('2026-01-03');

    useImmunizationTrackerStore.getState().removeRecord(profile.id, 'bcg');
    expect(useImmunizationTrackerStore.getState().records).toHaveLength(0);
  });
});

describe('immunization-tracker/validation', () => {
  it('hard-blocks missing date, administered before DOB, and future dates', () => {
    expect(
      assessImmunizationRecordDraft({
        profile,
        vaccineId: 'bcg',
        administeredDate: null,
        todayKey: '2026-03-01',
        records: [],
      }).hard?.code,
    ).toBe('required_administered_date');

    expect(
      assessImmunizationRecordDraft({
        profile,
        vaccineId: 'bcg',
        administeredDate: '2025-12-31',
        todayKey: '2026-03-01',
        records: [],
      }).hard?.code,
    ).toBe('administered_before_dob');

    expect(
      assessImmunizationRecordDraft({
        profile,
        vaccineId: 'bcg',
        administeredDate: '2026-04-01',
        todayKey: '2026-03-01',
        records: [],
      }).hard?.code,
    ).toBe('administered_future');
  });

  it('soft-warns far-from-recommended doses', () => {
    // Measles-1 recommended ~39 weeks after DOB 2026-01-01 ≈ late Sep 2026
    const far = assessImmunizationRecordDraft({
      profile,
      vaccineId: 'measles-1',
      administeredDate: '2026-01-02',
      todayKey: '2026-03-01',
      records: [],
    });
    expect(far.hard).toBeNull();
    expect(far.soft.some((s) => s.code === 'soft_very_early' || s.code === 'soft_far_from_recommended')).toBe(
      true,
    );
  });

  it('soft-warns when earlier doses in a series are missing', () => {
    const penta2 = VACCINE_SCHEDULE.find((item) => item.id === 'penta-2')!;
    expect(getPriorDosesInSeries(penta2).map((item) => item.id)).toContain('penta-1');

    const assessment = assessImmunizationRecordDraft({
      profile,
      vaccineId: 'penta-2',
      administeredDate: '2026-03-15',
      todayKey: '2026-03-20',
      records: [],
    });
    expect(assessment.soft.some((s) => s.code === 'soft_series_out_of_order')).toBe(true);

    const withPrior = assessImmunizationRecordDraft({
      profile,
      vaccineId: 'penta-2',
      administeredDate: '2026-03-15',
      todayKey: '2026-03-20',
      records: [
        {
          profileId: profile.id,
          vaccineId: 'penta-1',
          administeredDate: '2026-02-15',
        },
      ],
    });
    expect(withPrior.soft.some((s) => s.code === 'soft_series_out_of_order')).toBe(false);
  });

  it('builds a clean payload for a normal birth dose', () => {
    const assessment = assessImmunizationRecordDraft({
      profile,
      vaccineId: 'bcg',
      administeredDate: '2026-01-01',
      provider: ' City Clinic ',
      notes: ' batch A ',
      todayKey: '2026-03-01',
      records: [],
    });
    expect(assessment.hard).toBeNull();
    expect(assessment.payload).toEqual({
      profileId: profile.id,
      vaccineId: 'bcg',
      administeredDate: '2026-01-01',
      provider: 'City Clinic',
      notes: 'batch A',
    });
  });
});
