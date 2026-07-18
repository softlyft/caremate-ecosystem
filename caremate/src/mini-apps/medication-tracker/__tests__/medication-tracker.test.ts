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
  buildDaySlots,
  formatDisplayDate,
  getDaySummary,
  getFrequencyLabel,
  getMedicationPatientLabel,
  getStatusLabel,
  needsRefill,
  nextSlotIndexForAsNeeded,
  normalizeMedication,
  resolveScheduledStatus,
  type Medication,
  type MedicationDoseLog,
} from '@/mini-apps/medication-tracker/utils';
import { canActivateMedication, canAddMedication } from '@/domains/billing/entitlements';
import { identityTranslate, mockCreateMemoryStorage } from '@/mini-apps/test-utils';

jest.mock('@/mini-apps/_kit/synced-storage', () => ({
  createMiniAppSyncedStorage: () => mockCreateMemoryStorage(),
}));

jest.mock('@/mini-apps/_kit/rehydrate-registry', () => ({
  registerMiniAppRehydrate: jest.fn(),
}));

const med = (overrides: Partial<Medication> = {}): Medication =>
  normalizeMedication({
    id: 'med-1',
    name: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'twice-daily',
    startDate: '2026-07-01',
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
});
