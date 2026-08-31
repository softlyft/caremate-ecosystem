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
import {
  localizeBloodSugarContext,
  localizeBloodSugarContextOptions,
  localizeUnitChip,
  localizeVitalType,
  localizeVitalTypeOptions,
} from '@/mini-apps/vitals-tracker/localize';
import { BLOOD_SUGAR_CONTEXTS, VITAL_TYPES } from '@/mini-apps/vitals-tracker/constants';
import { identityTranslate } from '@/mini-apps/test-utils';

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
        id: '1b',
        type: 'blood_pressure',
        recordedAt: '2026-07-18T10:00:00.000Z',
        unit: 'mmHg',
      }),
    ).toBe('—');
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
          id: '2b',
          type: 'height',
          recordedAt: '2026-07-18T10:00:00.000Z',
          unit: 'cm',
          value: 175.26,
        },
        {
          blood_sugar: 'mg_dl',
          body_temperature: 'c',
          weight: 'kg',
          height: 'ft',
        },
      ),
    ).toBe(`5'9"`);
    expect(
      formatVitalValue({
        id: '2c',
        type: 'height',
        recordedAt: '2026-07-18T10:00:00.000Z',
        unit: 'cm',
      }),
    ).toBe('—');
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
    expect(
      formatVitalValue(
        {
          id: '4',
          type: 'blood_sugar',
          recordedAt: '2026-07-18T10:00:00.000Z',
          unit: 'mg_dl',
          value: 90,
        },
        {
          blood_sugar: 'mmol_l',
          body_temperature: 'c',
          weight: 'kg',
          height: 'cm',
        },
      ),
    ).toContain('mmol/L');
    expect(
      formatVitalValue(
        {
          id: '5',
          type: 'body_temperature',
          recordedAt: '2026-07-18T10:00:00.000Z',
          unit: 'c',
          value: 37,
        },
        {
          blood_sugar: 'mg_dl',
          body_temperature: 'f',
          weight: 'kg',
          height: 'cm',
        },
      ),
    ).toContain('°F');
    expect(unitLabel('mmol_l')).toBe('mmol/L');
    expect(unitLabel('percent')).toBe('%');
    expect(unitLabel('breaths_min')).toBe('breaths/min');
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

    const previousHr = {
      id: 'hr1',
      type: 'heart_rate' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'bpm' as const,
      value: 70,
    };
    expect(
      assessVitalDraft({ type: 'heart_rate', unit: 'bpm', valueText: '130' }, previousHr).soft.some(
        (s) => s.code === 'trend_large_change',
      ),
    ).toBe(true);

    const previousSugar = {
      id: 'bs1',
      type: 'blood_sugar' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'mg_dl' as const,
      value: 100,
    };
    expect(
      assessVitalDraft(
        {
          type: 'blood_sugar',
          unit: 'mg_dl',
          valueText: '280',
          bloodSugarContext: 'random',
        },
        previousSugar,
      ).soft.some((s) => s.code === 'trend_large_change'),
    ).toBe(true);

    const previousTemp = {
      id: 't1',
      type: 'body_temperature' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'c' as const,
      value: 36.5,
    };
    expect(
      assessVitalDraft(
        { type: 'body_temperature', unit: 'c', valueText: '39.5' },
        previousTemp,
      ).soft.some((s) => s.code === 'trend_large_change'),
    ).toBe(true);

    const previousO2 = {
      id: 'o1',
      type: 'oxygen_saturation' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'percent' as const,
      value: 98,
    };
    expect(
      assessVitalDraft(
        { type: 'oxygen_saturation', unit: 'percent', valueText: '88' },
        previousO2,
      ).soft.some((s) => s.code === 'trend_large_change'),
    ).toBe(true);
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
    const prefs = useVitalsTrackerStore.getState().unitPrefs;
    expect(preferUnitForType('blood_sugar', prefs)).toBe('mg_dl');
    expect(preferUnitForType('blood_pressure', prefs)).toBe('mmHg');
    expect(preferUnitForType('heart_rate', prefs)).toBe('bpm');
    expect(preferUnitForType('body_temperature', prefs)).toBe('c');
    expect(preferUnitForType('weight', prefs)).toBe('lbs');
    expect(preferUnitForType('height', prefs)).toBe('cm');
    expect(preferUnitForType('oxygen_saturation', prefs)).toBe('percent');
    expect(preferUnitForType('respiratory_rate', prefs)).toBe('breaths_min');

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

  it('adds height in feet and clears all state', () => {
    const entry = useVitalsTrackerStore.getState().addEntry({
      type: 'height',
      unit: 'ft',
      feet: 5,
      inches: 10,
    });
    expect(entry.unit).toBe('ft');
    expect(useVitalsTrackerStore.getState().entries).toHaveLength(1);
    useVitalsTrackerStore.getState().clearAll();
    expect(useVitalsTrackerStore.getState().entries).toEqual([]);
    expect(useVitalsTrackerStore.getState().hasCompletedSetup).toBe(false);
  });
});

describe('vitals-tracker/localize', () => {
  const t = identityTranslate;

  it('localizes vital types and blood sugar contexts', () => {
    expect(localizeVitalType('heart_rate', t)).toContain('types.heart_rate');
    expect(localizeVitalTypeOptions(t)).toHaveLength(VITAL_TYPES.length);
    expect(localizeBloodSugarContext('fasting', t)).toContain('bloodSugarContext.fasting');
    expect(localizeBloodSugarContextOptions(t)).toHaveLength(BLOOD_SUGAR_CONTEXTS.length);
  });

  it('falls back to unit labels when translation keys are missing', () => {
    const passthrough = (key: string) => key;
    expect(localizeUnitChip('mmol_l', passthrough)).toBe('mmol/L');
    expect(localizeUnitChip('mg_dl', (key) => `translated:${key}`)).toContain('translated:');
  });
});

describe('vitals-tracker/validation extras', () => {
  it('validates height in feet and soft respiratory trends', () => {
    const height = assessVitalDraft({
      type: 'height',
      unit: 'ft',
      feetText: '5',
      inchesText: '9',
    });
    expect(height.hard).toBeNull();
    expect(height.payload?.unit).toBe('cm');
    expect(height.payload?.value).toBeCloseTo(175.26, 1);

    const previousRr = {
      id: 'rr1',
      type: 'respiratory_rate' as const,
      recordedAt: '2026-07-17T10:00:00.000Z',
      unit: 'breaths_min' as const,
      value: 16,
    };
    const jump = assessVitalDraft(
      { type: 'respiratory_rate', unit: 'breaths_min', valueText: '40' },
      previousRr,
    );
    expect(jump.hard).toBeNull();
    expect(jump.soft.some((s) => s.code === 'trend_large_change')).toBe(true);
  });

  it('requires fields and soft-warns unusual blood sugar', () => {
    expect(assessVitalDraft({ type: 'heart_rate', unit: 'bpm', valueText: '' }).hard?.code).toBe(
      'required',
    );
    const sugar = assessVitalDraft({
      type: 'blood_sugar',
      unit: 'mg_dl',
      valueText: '520',
      bloodSugarContext: 'random',
    });
    expect(sugar.hard).toBeNull();
    expect(sugar.soft.some((s) => s.code === 'soft_unusual')).toBe(true);
  });
});
