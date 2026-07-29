import {
  FREQUENCY_OPTIONS,
  getFrequencyOption,
  type MedicationFrequency,
} from '@/mini-apps/medication-tracker/constants';
import { collectMedicationAlerts } from '@/mini-apps/medication-tracker/alerts';
import { resolveMedicationFamilyKidsSource } from '@/mini-apps/medication-tracker/family-source';
import {
  localizeDoseSlotLabel,
  localizeFrequencyLabel,
  localizeFrequencyOptions,
  localizeMedicationPatient,
  localizeMedicationStatus,
  localizeSlotLabel,
} from '@/mini-apps/medication-tracker/localize';
import {
  migrateMedicationPersistedState,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  areValidSlotTimes,
  buildDaySlots,
  dateToHhMm,
  durationDaysBetween,
  endDateForDurationDays,
  formatDisplayDate,
  formatHhMm,
  getDaySummary,
  getFrequencyLabel,
  getMedicationPatientLabel,
  getStatusLabel,
  hhMmToDate,
  isMedicationScheduledOnDate,
  isMedicationTreatmentEnded,
  isValidHhMm,
  needsRefill,
  nextSlotIndexForAsNeeded,
  normalizeMedication,
  parseHhMmParts,
  resolveScheduledStatus,
  resolveSlotTimes,
  type Medication,
  type MedicationDoseLog,
} from '@/mini-apps/medication-tracker/utils';
import { canActivateMedication, canAddMedication } from '@/domains/billing/entitlements';
import { identityTranslate } from '@/mini-apps/test-utils';

/** Fixed "today" so historical course fixtures stay active under normalizeMedication. */
const TEST_TODAY_KEY = '2026-07-16';

const med = (overrides: Partial<Medication> = {}, todayKey: string = TEST_TODAY_KEY): Medication =>
  normalizeMedication(
    {
      id: 'med-1',
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'twice-daily',
      startDate: '2026-07-01',
      endDate: null,
      active: true,
      forKid: false,
      familyMemberId: null,
      patientName: null,
      slotTimes: ['08:00', '20:00'],
      instructions: { kind: 'none' },
      quantityRemaining: null,
      refillAtThreshold: 5,
      refillDueDate: null,
      ...overrides,
    },
    { todayKey },
  );

describe('medication-tracker/dose times', () => {
  it('accepts only strict HH:mm values', () => {
    expect(isValidHhMm('08:00')).toBe(true);
    expect(isValidHhMm('23:59')).toBe(true);
    expect(isValidHhMm('00:00')).toBe(true);
    expect(isValidHhMm('8:00')).toBe(false);
    expect(isValidHhMm('24:00')).toBe(false);
    expect(isValidHhMm('12:60')).toBe(false);
    expect(isValidHhMm('abc')).toBe(false);
    expect(isValidHhMm('08:00am')).toBe(false);
    expect(isValidHhMm(' 09:30 ')).toBe(true);
    expect(parseHhMmParts('14:05')).toEqual({ hours: 14, minutes: 5 });
    expect(parseHhMmParts('nope')).toBeNull();
    expect(formatHhMm(9, 5)).toBe('09:05');
    expect(dateToHhMm(hhMmToDate('18:45'))).toBe('18:45');
  });

  it('requires a valid time for every scheduled dose slot', () => {
    expect(areValidSlotTimes(['08:00', '20:00'], 2)).toBe(true);
    expect(areValidSlotTimes(['08:00', 'nope'], 2)).toBe(false);
    expect(areValidSlotTimes(['08:00'], 2)).toBe(false);
    expect(areValidSlotTimes([], 0)).toBe(true);
  });

  it('replaces invalid stored slot times with frequency defaults', () => {
    expect(
      resolveSlotTimes({
        frequency: 'twice-daily',
        slotTimes: ['abc', '20:15', 'pasted!!'],
      }),
    ).toEqual(['08:00', '20:15']);
    expect(
      normalizeMedication(
        med({
          frequency: 'once-daily',
          slotTimes: ['not-a-time'],
        }),
      ).slotTimes,
    ).toEqual(['08:00']);
  });
});

describe('medication-tracker/constants', () => {
  it('resolves frequency options with fallback', () => {
    expect(getFrequencyOption('three-times-daily').dosesPerDay).toBe(3);
    expect(getFrequencyOption('as-needed').dosesPerDay).toBe(0);
    expect(getFrequencyOption('nope' as MedicationFrequency).id).toBe(FREQUENCY_OPTIONS[0]!.id);
  });
});

describe('medication-tracker/utils', () => {
  const midMorning = new Date(2026, 6, 17, 8, 30); // after 08:00, before miss grace
  const lateEvening = new Date(2026, 6, 17, 21, 30); // both slots missed

  it('formats dates and labels', () => {
    expect(formatDisplayDate('2026-07-17')).toContain('2026');
    expect(getFrequencyLabel('once-daily')).toBe('Once daily');
    expect(getMedicationPatientLabel(med())).toBe('You');
    expect(getMedicationPatientLabel(med({ forKid: true, patientName: 'Ada' }))).toBe('Ada');
    expect(getMedicationPatientLabel(med({ forKid: true, patientName: '  ' }))).toBe('Child');
    expect(getStatusLabel('taken')).toBe('Taken');
  });

  it('resolves scheduled status with clock awareness', () => {
    expect(
      resolveScheduledStatus({
        dateKey: '2026-07-17',
        slotTime: '08:00',
        referenceDate: midMorning,
        hasLog: false,
      }),
    ).toBe('due');
    expect(
      resolveScheduledStatus({
        dateKey: '2026-07-17',
        slotTime: '20:00',
        referenceDate: midMorning,
        hasLog: false,
      }),
    ).toBe('upcoming');
    expect(
      resolveScheduledStatus({
        dateKey: '2026-07-17',
        slotTime: '08:00',
        referenceDate: lateEvening,
        hasLog: false,
      }),
    ).toBe('missed');
    expect(
      resolveScheduledStatus({
        dateKey: '2026-07-10',
        slotTime: '08:00',
        referenceDate: midMorning,
        hasLog: false,
      }),
    ).toBe('missed');
  });

  it('builds scheduled slots for past, today, and future', () => {
    const medication = med({ frequency: 'twice-daily' });
    const past = buildDaySlots([medication], [], '2026-07-10', midMorning);
    expect(past.every((slot) => slot.status === 'missed')).toBe(true);
    expect(past).toHaveLength(2);

    const todaySlots = buildDaySlots([medication], [], '2026-07-17', midMorning);
    expect(todaySlots[0]!.status).toBe('due');
    expect(todaySlots[1]!.status).toBe('upcoming');

    const upcoming = buildDaySlots([medication], [], '2026-07-20', midMorning);
    expect(upcoming.every((slot) => slot.status === 'upcoming')).toBe(true);

    const logs: MedicationDoseLog[] = [
      { id: 'l1', medicationId: 'med-1', dateKey: '2026-07-17', slotIndex: 0 },
    ];
    const mixed = buildDaySlots([medication], logs, '2026-07-17', midMorning);
    expect(mixed[0]!.status).toBe('taken');
    expect(mixed[1]!.status).toBe('upcoming');
  });

  it('skips inactive meds and meds not yet started', () => {
    expect(
      buildDaySlots(
        [med({ active: false }), med({ id: 'med-2', startDate: '2026-07-20' })],
        [],
        '2026-07-17',
        midMorning,
      ),
    ).toEqual([]);
  });

  it('skips meds after the inclusive end date', () => {
    const course = med({ startDate: '2026-07-10', endDate: '2026-07-16' });
    expect(buildDaySlots([course], [], '2026-07-16', midMorning)).toHaveLength(2);
    expect(buildDaySlots([course], [], '2026-07-17', midMorning)).toEqual([]);
  });

  it('computes inclusive duration end dates', () => {
    expect(endDateForDurationDays('2026-07-01', 7)).toBe('2026-07-07');
    expect(durationDaysBetween('2026-07-01', '2026-07-07')).toBe(7);
    expect(isMedicationScheduledOnDate(med({ endDate: '2026-07-17' }), '2026-07-17')).toBe(true);
    expect(isMedicationScheduledOnDate(med({ endDate: '2026-07-16' }), '2026-07-17')).toBe(false);
  });

  it('deactivates medicines whose treatment window already ended', () => {
    expect(isMedicationTreatmentEnded(med({ endDate: '2026-07-20' }), '2026-07-27')).toBe(true);
    expect(isMedicationTreatmentEnded(med({ endDate: '2026-07-27' }), '2026-07-27')).toBe(false);
    expect(isMedicationTreatmentEnded(med({ endDate: null }), '2026-07-27')).toBe(false);

    const ended = normalizeMedication(
      med({ startDate: '2026-07-20', endDate: '2026-07-22', active: true }),
      { todayKey: '2026-07-27' },
    );
    expect(ended.active).toBe(false);

    const stillRunning = normalizeMedication(
      med({ startDate: '2026-07-20', endDate: '2026-07-30', active: true }),
      { todayKey: '2026-07-27' },
    );
    expect(stillRunning.active).toBe(true);
  });

  it('keeps an open as-needed row after doses are logged', () => {
    const medication = med({ frequency: 'as-needed', slotTimes: [] });
    const open = buildDaySlots([medication], [], '2026-07-17', midMorning);
    expect(open).toHaveLength(1);
    expect(open[0]!.status).toBe('as-needed');

    const logs: MedicationDoseLog[] = [
      { id: 'l1', medicationId: 'med-1', dateKey: '2026-07-17', slotIndex: 0 },
      { id: 'l2', medicationId: 'med-1', dateKey: '2026-07-17', slotIndex: 1 },
    ];
    const withLogs = buildDaySlots([medication], logs, '2026-07-17', midMorning);
    expect(withLogs.filter((slot) => slot.status === 'taken')).toHaveLength(2);
    expect(withLogs.filter((slot) => slot.status === 'as-needed')).toHaveLength(1);
    expect(withLogs.find((slot) => slot.status === 'as-needed')!.slotIndex).toBe(2);
  });

  it('summarizes the day and next as-needed index', () => {
    const medication = med();
    const slots = buildDaySlots(
      [medication],
      [{ id: 'l1', medicationId: 'med-1', dateKey: '2026-07-17', slotIndex: 0 }],
      '2026-07-17',
      midMorning,
    );
    const summary = getDaySummary(slots);
    expect(summary.taken).toBe(1);
    expect(summary.upcoming).toBe(1);
    expect(summary.expected).toBe(2);
    expect(summary.progress).toBe(0.5);

    expect(nextSlotIndexForAsNeeded('med-1', '2026-07-17', [])).toBe(0);
    expect(
      nextSlotIndexForAsNeeded('med-1', '2026-07-17', [
        { id: 'l1', medicationId: 'med-1', dateKey: '2026-07-17', slotIndex: 2 },
      ]),
    ).toBe(3);
  });

  it('detects refill needs by quantity and due date', () => {
    expect(needsRefill(med({ quantityRemaining: 3, refillAtThreshold: 5 }), '2026-07-17')).toBe(
      true,
    );
    expect(needsRefill(med({ quantityRemaining: 10, refillAtThreshold: 5 }), '2026-07-17')).toBe(
      false,
    );
    expect(needsRefill(med({ refillDueDate: '2026-07-17' }), '2026-07-17')).toBe(true);
    expect(needsRefill(med({ refillDueDate: '2026-07-20' }), '2026-07-17')).toBe(false);
  });
});

describe('medication-tracker/alerts', () => {
  it('collects due, missed, and refill candidates with stable dedupe keys', () => {
    const midMorning = new Date(2026, 6, 17, 8, 30);
    const candidates = collectMedicationAlerts({
      medications: [
        med({ quantityRemaining: 2, refillAtThreshold: 5 }),
        med({
          id: 'med-2',
          name: 'Night',
          slotTimes: ['07:00', '08:00'],
          quantityRemaining: null,
        }),
      ],
      logs: [],
      now: midMorning,
    });

    expect(candidates.some((item) => item.eventType === 'dose_due')).toBe(true);
    expect(candidates.some((item) => item.eventType === 'refill_due')).toBe(true);
    expect(candidates.find((item) => item.eventType === 'refill_due')!.dedupeKey).toContain(
      'med:refill:med-1',
    );

    const again = collectMedicationAlerts({
      medications: [med({ quantityRemaining: 2 })],
      logs: [],
      now: midMorning,
    });
    expect(again.map((item) => item.dedupeKey).sort()).toEqual(
      candidates
        .filter((item) => item.entityId === 'med-1')
        .map((item) => item.dedupeKey)
        .sort(),
    );
  });
});

describe('medication entitlements activate gate', () => {
  it('blocks reactivating beyond free limit', () => {
    const meds = [
      { id: 'a', active: true },
      { id: 'b', active: true },
      { id: 'c', active: true },
      { id: 'd', active: false },
    ];
    expect(canAddMedication('free', 3)).toBe(false);
    expect(canActivateMedication('free', meds, 'd', true)).toBe(false);
    expect(canActivateMedication('free', meds, 'd', false)).toBe(true);
    expect(canActivateMedication('free', meds, 'a', true)).toBe(true);
    expect(canActivateMedication('personal', meds, 'd', true)).toBe(true);
  });
});

describe('medication-tracker/localize', () => {
  const t = identityTranslate;

  it('localizes frequency and slots', () => {
    expect(localizeFrequencyLabel('once-daily', t)).toContain('once-daily.label');
    expect(localizeFrequencyOptions(t)).toHaveLength(FREQUENCY_OPTIONS.length);
    expect(localizeSlotLabel('twice-daily', 0, t, 'Morning')).toContain('slots.0');
    expect(localizeMedicationStatus('missed', t)).toContain('status.missed');
    expect(localizeMedicationPatient(med(), t)).toContain('ui.you');
  });

  it('localizes dose slot labels for scheduled and as-needed', () => {
    const scheduled = buildDaySlots([med()], [], '2026-07-17', new Date(2026, 6, 17, 8, 30))[0]!;
    expect(localizeDoseSlotLabel(scheduled, t)).toContain('twice-daily.slots.0');

    const asNeededOpen = buildDaySlots(
      [med({ frequency: 'as-needed', slotTimes: [] })],
      [],
      '2026-07-17',
      new Date(2026, 6, 17, 8, 30),
    )[0]!;
    expect(localizeDoseSlotLabel(asNeededOpen, t)).toContain('as-needed.label');
  });
});

describe('medication-tracker/family-source', () => {
  const child = { id: 'c1', fullName: 'Ada', dateOfBirth: '2020-01-01' };

  it('resolves guest, loading, setup, empty, and ready states', () => {
    expect(
      resolveMedicationFamilyKidsSource({
        isGuest: true,
        householdLoading: false,
        childrenLoading: false,
        householdId: null,
        children: [],
      }).status,
    ).toBe('guest');

    expect(
      resolveMedicationFamilyKidsSource({
        isGuest: false,
        householdLoading: false,
        childrenLoading: false,
        householdId: 'hh-1',
        children: [child],
      }),
    ).toEqual({ status: 'ready', children: [child] });
  });
});

describe('medication-tracker/migrate', () => {
  it('normalizes legacy medication fields and default schedule', () => {
    const migrated = migrateMedicationPersistedState({
      medications: [
        {
          id: 'm1',
          name: 'A',
          dosage: '1',
          frequency: 'once-daily',
          startDate: '2026-01-01',
          active: true,
        },
      ],
      activeMedicationId: 'm1',
      logs: [],
    });
    expect(migrated.medications![0]).toMatchObject({
      forKid: false,
      familyMemberId: null,
      patientName: null,
      slotTimes: ['08:00'],
      instructions: { kind: 'none' },
      refillAtThreshold: 5,
      endDate: null,
    });
  });
});

describe('medication-tracker/store', () => {
  beforeEach(() => {
    useMedicationTrackerStore.getState().clearAll();
  });

  it('adds, updates, activates, and removes medications', () => {
    const created = useMedicationTrackerStore.getState().addMedication({
      name: '  Ibuprofen  ',
      dosage: ' 200mg ',
      frequency: 'once-daily',
      startDate: '2026-07-01',
      notes: ' after food ',
      instructions: { kind: 'with_food' },
    });
    expect(created.name).toBe('Ibuprofen');
    expect(created.slotTimes).toEqual(['08:00']);
    expect(created.instructions.kind).toBe('with_food');
    expect(useMedicationTrackerStore.getState().activeMedicationId).toBe(created.id);

    useMedicationTrackerStore.getState().updateMedication(created.id, {
      name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'twice-daily',
      startDate: '2026-07-01',
      active: true,
      slotTimes: ['09:00', '21:00'],
    });
    expect(useMedicationTrackerStore.getState().medications[0]!.dosage).toBe('400mg');
    expect(useMedicationTrackerStore.getState().medications[0]!.slotTimes).toEqual([
      '09:00',
      '21:00',
    ]);

    useMedicationTrackerStore.getState().updateMedication(created.id, {
      name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'twice-daily',
      startDate: '2026-07-01',
      active: true,
      slotTimes: ['paste', '21:00'],
    });
    expect(useMedicationTrackerStore.getState().medications[0]!.slotTimes).toEqual([
      '08:00',
      '21:00',
    ]);

    const kidMed = useMedicationTrackerStore.getState().addMedication({
      name: 'Syrup',
      dosage: '5ml',
      frequency: 'as-needed',
      startDate: '2026-07-01',
      forKid: true,
      familyMemberId: 'child-1',
      patientName: 'Ada',
    });
    expect(kidMed.forKid).toBe(true);

    useMedicationTrackerStore.getState().removeMedication(created.id);
    expect(useMedicationTrackerStore.getState().activeMedicationId).toBe(kidMed.id);
  });

  it('logs doses with takenAt and decrements quantity', () => {
    const medication = useMedicationTrackerStore.getState().addMedication({
      name: 'Vitamin',
      dosage: '1 tab',
      frequency: 'once-daily',
      startDate: '2026-07-01',
      quantityRemaining: 10,
    });
    const log = useMedicationTrackerStore.getState().logDose({
      medicationId: medication.id,
      dateKey: '2026-07-17',
      slotIndex: 0,
      notes: ' morning ',
    });
    expect(log.notes).toBe('morning');
    expect(log.takenAt).toBeTruthy();
    expect(useMedicationTrackerStore.getState().medications[0]!.quantityRemaining).toBe(9);

    useMedicationTrackerStore.getState().removeDoseLog(log.id);
    expect(useMedicationTrackerStore.getState().logs).toHaveLength(0);
  });

  it('clears patient fields when switching a med off forKid', () => {
    const medication = useMedicationTrackerStore.getState().addMedication({
      name: 'Syrup',
      dosage: '5ml',
      frequency: 'once-daily',
      startDate: '2026-07-01',
      forKid: true,
      familyMemberId: 'child-1',
      patientName: 'Ada',
    });
    useMedicationTrackerStore.getState().updateMedication(medication.id, {
      name: 'Syrup',
      dosage: '5ml',
      frequency: 'once-daily',
      startDate: '2026-07-01',
      forKid: false,
    });
    const updated = useMedicationTrackerStore.getState().medications[0]!;
    expect(updated.forKid).toBe(false);
    expect(updated.familyMemberId).toBeNull();
    expect(updated.patientName).toBeNull();
  });

  it('retains a past start date when editing a medication', () => {
    const medication = useMedicationTrackerStore.getState().addMedication({
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'twice-daily',
      startDate: '2026-07-21',
      endDate: '2026-08-27',
    });

    useMedicationTrackerStore.getState().updateMedication(medication.id, {
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'twice-daily',
      startDate: '2026-07-10',
      endDate: '2026-07-16',
      active: true,
    });

    const updated = useMedicationTrackerStore.getState().medications[0]!;
    expect(updated.startDate).toBe('2026-07-10');
    expect(updated.endDate).toBe('2026-07-16');
    // Ended courses cannot remain active even if the write requests it.
    expect(updated.active).toBe(false);
  });
});
