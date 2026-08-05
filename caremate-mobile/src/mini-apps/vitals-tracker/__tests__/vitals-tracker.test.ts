import {
  cmToHeightParts,
  convertBloodSugar,
  convertTemperature,
  convertWeight,
  formatVitalValue,
  getLatestByType,
  getRecentEntries,
  heightToCm,
  parsePositiveNumber,
  unitLabel,
} from '@/mini-apps/vitals-tracker/utils';
import { preferUnitForType, useVitalsTrackerStore } from '@/mini-apps/vitals-tracker/store';
import {
  assessVitalDraft,
  buildVitalEntryPayload,
  detectTypoSuggestion,
  isValidVitalDraft,
} from '@/mini-apps/vitals-tracker/validation';

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

  it('formats vital values and respects display prefs', () => {
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
    expect(
      formatVitalValue(
        {
          id: '3',
          type: 'weight',
          recordedAt: '2026-07-18T10:00:00.000Z',
          unit: 'kg',
          value: 70,
        },
        {
          blood_sugar: 'mg_dl',
          body_temperature: 'c',
          weight: 'lbs',
          height: 'cm',
        },
      ),
    ).toContain('lbs');
    expect(unitLabel('mmol_l')).toBe('mmol/L');
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

describe('vitals-tracker/validation', () => {
  it('hard-rejects impossible blood pressure and diastolic ≥ systolic', () => {
    expect(
      assessVitalDraft({
        type: 'blood_pressure',
        unit: 'mmHg',
        systolicText: '120',
        diastolicText: '130',
      }).hard?.messageKey,
    ).toBe('bpDiastolicOrder');

    expect(
      assessVitalDraft({
        type: 'blood_pressure',
        unit: 'mmHg',
        systolicText: '40',
        diastolicText: '20',
      }).hard?.code,
    ).toBe('out_of_range');
  });

  it('soft-warns unusual blood pressure without blocking', () => {
    const assessment = assessVitalDraft({
      type: 'blood_pressure',
      unit: 'mmHg',
      systolicText: '210',
      diastolicText: '125',
    });
    expect(assessment.hard).toBeNull();
    expect(assessment.payload?.systolic).toBe(210);
    expect(assessment.soft.some((s) => s.messageKey === 'bpUnusual')).toBe(true);
  });

  it('requires blood sugar context and stores mg/dL', () => {
    expect(
      assessVitalDraft({
        type: 'blood_sugar',
        unit: 'mmol_l',
        valueText: '5.5',
      }).hard?.code,
    ).toBe('blood_sugar_context_required');

    const ok = assessVitalDraft({
      type: 'blood_sugar',
      unit: 'mmol_l',
      valueText: '5.5',
      bloodSugarContext: 'fasting',
    });
    expect(ok.hard).toBeNull();
    expect(ok.payload?.unit).toBe('mg_dl');
    expect(ok.payload?.value).toBeCloseTo(99.1, 0);
    expect(ok.payload?.bloodSugarContext).toBe('fasting');
  });

  it('hard and soft ranges for other vitals', () => {
    expect(assessVitalDraft({ type: 'heart_rate', unit: 'bpm', valueText: '15' }).hard?.code).toBe(
      'out_of_range',
    );
    expect(
      assessVitalDraft({ type: 'heart_rate', unit: 'bpm', valueText: '35' }).soft[0]?.code,
    ).toBe('soft_unusual');

    expect(
      assessVitalDraft({ type: 'oxygen_saturation', unit: 'percent', valueText: '101' }).hard?.code,
    ).toBe('out_of_range');
    expect(
      assessVitalDraft({ type: 'oxygen_saturation', unit: 'percent', valueText: '82' }).soft[0]
        ?.messageKey,
    ).toBe('oxygenLow');

    expect(
      assessVitalDraft({ type: 'body_temperature', unit: 'c', valueText: '29' }).hard?.code,
    ).toBe('out_of_range');
    expect(
      assessVitalDraft({ type: 'body_temperature', unit: 'f', valueText: '98.6' }).payload?.unit,
    ).toBe('c');

    expect(assessVitalDraft({ type: 'weight', unit: 'kg', valueText: '20' }).soft[0]?.code).toBe(
      'soft_unusual',
    );
    expect(assessVitalDraft({ type: 'height', unit: 'cm', valueText: '90' }).soft[0]?.code).toBe(
      'soft_unusual',
    );
    expect(
      assessVitalDraft({ type: 'respiratory_rate', unit: 'breaths_min', valueText: '90' }).hard
        ?.code,
    ).toBe('out_of_range');
  });

  it('detects likely typos', () => {
    expect(
      detectTypoSuggestion({ type: 'blood_sugar', unit: 'mg_dl', value: 1200 })?.suggested,
    ).toBe(120);
    expect(detectTypoSuggestion({ type: 'weight', unit: 'kg', value: 700 })?.suggested).toBe(70);
    expect(
      detectTypoSuggestion({ type: 'body_temperature', unit: 'c', value: 370 })?.suggested,
    ).toBe(37);

    const sugarTypo = assessVitalDraft({
      type: 'blood_sugar',
      unit: 'mg_dl',
      valueText: '1200',
      bloodSugarContext: 'random',
    });
    expect(sugarTypo.payload).toBeNull();
    expect(sugarTypo.soft.some((s) => s.code === 'typo_suggestion')).toBe(true);
  });

  it('flags large changes vs previous readings', () => {
    const previousWeight = {
      id: 'w1',
      type: 'weight' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'kg' as const,
      value: 72,
    };
    const jump = assessVitalDraft({ type: 'weight', unit: 'kg', valueText: '170' }, previousWeight);
    expect(jump.hard).toBeNull();
    expect(jump.soft.some((s) => s.messageKey === 'trendWeight')).toBe(true);

    const previousBp = {
      id: 'bp1',
      type: 'blood_pressure' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'mmHg' as const,
      systolic: 120,
      diastolic: 80,
    };
    const bpJump = assessVitalDraft(
      {
        type: 'blood_pressure',
        unit: 'mmHg',
        systolicText: '280',
        diastolicText: '180',
      },
      previousBp,
    );
    expect(bpJump.soft.some((s) => s.messageKey === 'trendBloodPressure')).toBe(true);
  });

  it('builds payloads for valid drafts and rejects oxygen > 100', () => {
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
});

describe('vitals-tracker/store', () => {
  beforeEach(() => {
    useVitalsTrackerStore.getState().clearAll();
  });

  it('adds entries and remembers unit prefs / setup', () => {
    const store = useVitalsTrackerStore.getState();
    store.setUnitPrefs({ blood_sugar: 'mg_dl', weight: 'lbs' });
    expect(preferUnitForType('blood_sugar', useVitalsTrackerStore.getState().unitPrefs)).toBe(
      'mg_dl',
    );
    expect(preferUnitForType('blood_pressure', useVitalsTrackerStore.getState().unitPrefs)).toBe(
      'mmHg',
    );

    store.completeSetup({ body_temperature: 'f' });
    expect(useVitalsTrackerStore.getState().hasCompletedSetup).toBe(true);
    expect(useVitalsTrackerStore.getState().unitPrefs.body_temperature).toBe('f');

    const entry = useVitalsTrackerStore.getState().addEntry({
      type: 'heart_rate',
      unit: 'bpm',
      value: 72,
    });
    expect(entry.id).toBeTruthy();
    expect(entry.source).toBe('manual');
    expect(useVitalsTrackerStore.getState().entries).toHaveLength(1);
    useVitalsTrackerStore.getState().removeEntry(entry.id);
    expect(useVitalsTrackerStore.getState().entries).toHaveLength(0);
  });
});
