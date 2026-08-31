import { projectMiniAppEvents } from '@/domains/timeline/projector';
import {
  addCalendarDays,
  isDateKey,
  isOccurredOnInConsentWindow,
  todayDateKey,
} from '@/domains/timeline/consent-window';

describe('projectMiniAppEvents', () => {
  it('maps vitals entries with a stable id and occurred_on from recordedAt', () => {
    const events = projectMiniAppEvents('user-1', 'vitals', {
      entries: [
        {
          id: 'v1',
          type: 'heart_rate',
          recordedAt: '2026-03-02T15:04:00.000Z',
          unit: 'bpm',
          value: 72,
        },
        {
          id: 'v2',
          type: 'blood_pressure',
          recordedAt: '2026-03-02T08:00:00.000Z',
          unit: 'mmHg',
          systolic: 120,
          diastolic: 80,
        },
      ],
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: 'user-1:vitals:vital:v1',
      kind: 'vital',
      occurredOn: '2026-03-02',
      occurredAt: '2026-03-02T15:04:00.000Z',
      title: 'Heart Rate',
      summary: '72 bpm',
    });
    expect(events[1]?.summary).toBe('120/80 mmHg');
  });

  it('maps medication dose logs and drops removed ids on a later projection', () => {
    const first = projectMiniAppEvents('user-1', 'medication', {
      medications: [{ id: 'm1', name: 'Metformin' }],
      logs: [{ id: 'l1', medicationId: 'm1', dateKey: '2026-01-15', slotIndex: 0 }],
    });
    expect(first.map((e) => e.id)).toEqual(['user-1:medication:med_dose:l1']);
    expect(first[0]?.title).toBe('Metformin');

    const second = projectMiniAppEvents('user-1', 'medication', {
      medications: [{ id: 'm1', name: 'Metformin' }],
      logs: [],
    });
    expect(second).toEqual([]);
  });

  it('maps pregnancy logs, TT doses, period days, vaccines, and checkups', () => {
    const pregnancy = projectMiniAppEvents('u', 'pregnancy', {
      pregnancyId: 'preg-1',
      dailyLogs: {
        '2026-04-01': { dateKey: '2026-04-01', mood: 'ok', symptoms: ['nausea'], kickCount: 4 },
      },
      maternalTtDoses: [{ id: 'tt1', dateKey: '2026-04-10' }],
      pastPregnancies: [
        {
          id: 'arch-1',
          dailyLogs: [{ dateKey: '2025-06-01', mood: 'tired', symptoms: [], kickCount: 0 }],
          maternalTtDoses: [{ id: 'tt1', dateKey: '2025-05-01' }],
        },
      ],
    });
    expect(pregnancy.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        'u:pregnancy:pregnancy_log:preg-1:2026-04-01',
        'u:pregnancy:tt_dose:preg-1:tt1',
        'u:pregnancy:pregnancy_log:arch-1:2025-06-01',
        'u:pregnancy:tt_dose:arch-1:tt1',
      ]),
    );

    const period = projectMiniAppEvents('u', 'period', { loggedPeriodDays: ['2026-02-01'] });
    expect(period[0]?.id).toBe('u:period:period_day:2026-02-01');

    const shots = projectMiniAppEvents('u', 'immunization', {
      profiles: [{ id: 'kid-1', name: 'Ada' }],
      records: [{ profileId: 'kid-1', vaccineId: 'bcg', administeredDate: '2026-01-02' }],
    });
    expect(shots[0]?.id).toBe('u:immunization:vaccine:kid-1:bcg');
    expect(shots[0]?.title).toContain('BCG');

    const checkups = projectMiniAppEvents('u', 'checkup', {
      completions: [{ checkupId: 'dental-checkup', year: 2026, completedDate: '2026-07-04' }],
    });
    expect(checkups[0]?.id).toBe('u:checkup:checkup:dental-checkup:2026');
    expect(checkups[0]?.title).toBe('Dental checkup');
  });
});

describe('isOccurredOnInConsentWindow', () => {
  it('allows events only when consent is active and occurred_on is inside the frozen dates', () => {
    expect(
      isOccurredOnInConsentWindow({
        occurredOn: '2026-03-01',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        status: 'active',
      }),
    ).toBe(true);
    expect(
      isOccurredOnInConsentWindow({
        occurredOn: '2025-12-31',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        status: 'active',
      }),
    ).toBe(false);
    expect(
      isOccurredOnInConsentWindow({
        occurredOn: '2026-03-01',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        status: 'inactive',
      }),
    ).toBe(false);
    expect(
      isOccurredOnInConsentWindow({
        occurredOn: '2026-03-01',
        periodStart: '  ',
        periodEnd: '2026-03-31',
        status: 'active',
      }),
    ).toBe(false);
    expect(
      isOccurredOnInConsentWindow({
        occurredOn: '2026-03-31',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
        status: 'active',
      }),
    ).toBe(true);
  });
});

describe('consent-window date helpers', () => {
  it('validates date keys and shifts calendar days', () => {
    expect(isDateKey('2026-07-16')).toBe(true);
    expect(isDateKey('2026-7-16')).toBe(false);
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(todayDateKey(new Date(2026, 6, 16, 12, 0, 0))).toBe('2026-07-16');
  });
});
