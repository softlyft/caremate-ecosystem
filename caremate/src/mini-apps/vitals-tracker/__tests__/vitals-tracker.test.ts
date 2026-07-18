import {
  buildVitalEntryPayload,
  cmToHeightParts,
  convertBloodSugar,
  convertTemperature,
  convertWeight,
  formatVitalValue,
  getLatestByType,
  getRecentEntries,
  heightToCm,
  isValidVitalDraft,
  parsePositiveNumber,
  unitLabel,
} from '@/mini-apps/vitals-tracker/utils';
import { preferUnitForType, useVitalsTrackerStore } from '@/mini-apps/vitals-tracker/store';
import { mockCreateMemoryStorage } from '@/mini-apps/test-utils';

jest.mock('@/mini-apps/_kit/synced-storage', () => ({
  createMiniAppSyncedStorage: () => mockCreateMemoryStorage(),
}));

jest.mock('@/mini-apps/_kit/rehydrate-registry', () => ({
  registerMiniAppRehydrate: jest.fn(),
}));

describe('vitals-tracker/utils', () => {
  it('parses positive numbers and rejects invalid input', () => {
    expect(parsePositiveNumber('12.5')).toBe(12.5);
    expect(parsePositiveNumber('0')).toBe(0);
    expect(parsePositiveNumber('-1')).toBeNull();
    expect(parsePositiveNumber('abc')).toBeNull();
  });

  it('converts common units', () => {
    expect(convertBloodSugar(5, 'mmol_l', 'mg_dl')).toBeCloseTo(90.091, 2);
    expect(convertBloodSugar(90.091, 'mg_dl', 'mmol_l')).toBeCloseTo(5, 2);
    expect(convertTemperature(37, 'c', 'f')).toBeCloseTo(98.6, 1);
    expect(convertTemperature(98.6, 'f', 'c')).toBeCloseTo(37, 1);
    expect(convertWeight(70, 'kg', 'lbs')).toBeCloseTo(154.323, 2);
    expect(heightToCm({ unit: 'cm', value: 175 })).toBe(175);
    expect(heightToCm({ unit: 'ft', feet: 5, inches: 9 })).toBeCloseTo(175.26, 1);
    expect(cmToHeightParts(175.26)).toEqual({ feet: 5, inches: 9 });
  });

  it('formats vital values', () => {
    expect(
      formatVitalValue({
        id: '1',
        type: 'blood_pressure',
        recordedAt: '2026-07-18T10:00:00.000Z',
        unit: 'mmHg',
        systolic: 120,
        diastolic: 80,
      }),
    ).toBe('120/80 mmHg');
    expect(
      formatVitalValue({
        id: '2',
        type: 'height',
        recordedAt: '2026-07-18T10:00:00.000Z',
        unit: 'ft',
        feet: 5,
        inches: 8,
      }),
    ).toBe(`5'8"`);
    expect(unitLabel('mmol_l')).toBe('mmol/L');
  });

  it('validates drafts and builds payloads', () => {
    expect(
      isValidVitalDraft({
        type: 'heart_rate',
        unit: 'bpm',
        valueText: '72',
      }),
    ).toBe(true);
    expect(
      isValidVitalDraft({
        type: 'oxygen_saturation',
        unit: 'percent',
        valueText: '101',
      }),
    ).toBe(false);

    const bp = buildVitalEntryPayload({
      type: 'blood_pressure',
      unit: 'mmHg',
      systolicText: '118',
      diastolicText: '76',
      notes: ' morning ',
    });
    expect(bp).toEqual({
      type: 'blood_pressure',
      unit: 'mmHg',
      systolic: 118,
      diastolic: 76,
      notes: 'morning',
    });
  });

  it('picks latest and recent entries', () => {
    const entries = [
      {
        id: 'a',
        type: 'heart_rate' as const,
        recordedAt: '2026-07-18T08:00:00.000Z',
        unit: 'bpm' as const,
        value: 70,
      },
      {
        id: 'b',
        type: 'heart_rate' as const,
        recordedAt: '2026-07-18T12:00:00.000Z',
        unit: 'bpm' as const,
        value: 80,
      },
      {
        id: 'c',
        type: 'weight' as const,
        recordedAt: '2026-07-17T12:00:00.000Z',
        unit: 'kg' as const,
        value: 70,
      },
    ];
    expect(getLatestByType(entries).heart_rate?.value).toBe(80);
    expect(getRecentEntries(entries, 2).map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('vitals-tracker/store', () => {
  beforeEach(() => {
    useVitalsTrackerStore.getState().clearAll();
  });

  it('adds entries and remembers unit prefs', () => {
    const store = useVitalsTrackerStore.getState();
    store.setUnitPrefs({ blood_sugar: 'mg_dl', weight: 'lbs' });
    expect(preferUnitForType('blood_sugar', useVitalsTrackerStore.getState().unitPrefs)).toBe(
      'mg_dl',
    );
    expect(preferUnitForType('blood_pressure', useVitalsTrackerStore.getState().unitPrefs)).toBe(
      'mmHg',
    );

    const entry = useVitalsTrackerStore.getState().addEntry({
      type: 'heart_rate',
      unit: 'bpm',
      value: 72,
    });
    expect(entry.id).toBeTruthy();
    expect(useVitalsTrackerStore.getState().entries).toHaveLength(1);
    useVitalsTrackerStore.getState().removeEntry(entry.id);
    expect(useVitalsTrackerStore.getState().entries).toHaveLength(0);
  });
});
