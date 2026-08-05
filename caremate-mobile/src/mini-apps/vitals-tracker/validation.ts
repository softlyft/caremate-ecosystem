/**
 * Physiological validation for vitals logging.
 * - Hard: block save
 * - Soft: confirm before save (unusual, typo guess, large change vs previous)
 * Ranges are evaluated in canonical units where applicable.
 */

import type {
  BloodSugarContext,
  VitalEntry,
  VitalType,
  VitalUnit,
} from '@/mini-apps/vitals-tracker/constants';
import {
  convertBloodSugar,
  convertTemperature,
  convertWeight,
  heightToCm,
  parsePositiveNumber,
} from '@/mini-apps/vitals-tracker/utils';

export type VitalIssueCode =
  | 'required'
  | 'bp_diastolic_gte_systolic'
  | 'out_of_range'
  | 'soft_unusual'
  | 'typo_suggestion'
  | 'trend_large_change'
  | 'blood_sugar_context_required';

export type VitalIssue = {
  code: VitalIssueCode;
  /** i18n key under apps.vitals.validation.* */
  messageKey: string;
  params?: Record<string, string | number>;
  /** Suggested corrected numeric value (display unit). */
  suggestedDisplayValue?: number;
  suggestedSystolic?: number;
  suggestedDiastolic?: number;
};

export type VitalDraftInput = {
  type: VitalType;
  unit: VitalUnit;
  valueText?: string;
  systolicText?: string;
  diastolicText?: string;
  feetText?: string;
  inchesText?: string;
  notes?: string;
  bloodSugarContext?: BloodSugarContext | null;
};

export type VitalAssessment = {
  /** Parsed payload ready to save (canonical units). Null if hard-blocked or unparsable. */
  payload: Omit<VitalEntry, 'id' | 'recordedAt'> | null;
  hard: VitalIssue | null;
  soft: VitalIssue[];
};

/** Canonical storage units. */
export const CANONICAL = {
  blood_sugar: 'mg_dl' as const,
  body_temperature: 'c' as const,
  weight: 'kg' as const,
  height: 'cm' as const,
};

const HARD = {
  blood_pressure: { sysMin: 50, sysMax: 300, diaMin: 30, diaMax: 200 },
  blood_sugar_mg_dl: { min: 20, max: 800 },
  heart_rate: { min: 20, max: 250 },
  body_temperature_c: { min: 30, max: 45 },
  weight_kg: { min: 1, max: 500 },
  height_cm: { min: 30, max: 300 },
  oxygen_saturation: { min: 50, max: 100 },
  respiratory_rate: { min: 5, max: 80 },
} as const;

const SOFT = {
  blood_pressure: { sysLow: 80, sysHigh: 200, diaLow: 50, diaHigh: 120 },
  blood_sugar_mg_dl: { low: 40, high: 500 },
  heart_rate: { low: 40, high: 180 },
  body_temperature_c: { low: 34, high: 41 },
  weight_kg: { low: 25, high: 250 },
  height_cm: { low: 100, high: 230 },
  oxygen_saturation: { low: 85 },
  respiratory_rate: { low: 8, high: 40 },
} as const;

/** Relative change thresholds for trend soft checks. */
const TREND = {
  weight_kg_delta: 15,
  weight_kg_ratio: 0.25,
  blood_pressure_sys_delta: 40,
  blood_pressure_dia_delta: 30,
  heart_rate_delta: 40,
  blood_sugar_mg_dl_delta: 150,
  body_temperature_c_delta: 2,
  oxygen_saturation_delta: 8,
  respiratory_rate_delta: 15,
} as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sugarToMgDl(value: number, unit: VitalUnit): number {
  if (unit === 'mg_dl' || unit === 'mmol_l') {
    return convertBloodSugar(value, unit, 'mg_dl');
  }
  return value;
}

function tempToC(value: number, unit: VitalUnit): number {
  if (unit === 'c' || unit === 'f') {
    return convertTemperature(value, unit, 'c');
  }
  return value;
}

function weightToKg(value: number, unit: VitalUnit): number {
  if (unit === 'kg' || unit === 'lbs') {
    return convertWeight(value, unit, 'kg');
  }
  return value;
}

function entrySugarMgDl(entry: VitalEntry): number | null {
  if (entry.type !== 'blood_sugar' || entry.value == null) return null;
  if (entry.unit === 'mg_dl' || entry.unit === 'mmol_l') {
    return sugarToMgDl(entry.value, entry.unit);
  }
  return entry.value;
}

function entryTempC(entry: VitalEntry): number | null {
  if (entry.type !== 'body_temperature' || entry.value == null) return null;
  if (entry.unit === 'c' || entry.unit === 'f') {
    return tempToC(entry.value, entry.unit);
  }
  return entry.value;
}

function entryWeightKg(entry: VitalEntry): number | null {
  if (entry.type !== 'weight' || entry.value == null) return null;
  if (entry.unit === 'kg' || entry.unit === 'lbs') {
    return weightToKg(entry.value, entry.unit);
  }
  return entry.value;
}

/**
 * Likely typo: value is ~10× a plausible reading (or 10× temperature).
 */
export function detectTypoSuggestion(input: {
  type: VitalType;
  unit: VitalUnit;
  value: number;
}): { suggested: number; messageKey: string } | null {
  const { type, unit, value } = input;
  if (type === 'blood_sugar') {
    const mg = sugarToMgDl(value, unit);
    if (mg >= 1000 && mg <= 8000) {
      const suggestedMg = round1(mg / 10);
      if (suggestedMg >= HARD.blood_sugar_mg_dl.min && suggestedMg <= HARD.blood_sugar_mg_dl.max) {
        const suggested =
          unit === 'mmol_l'
            ? round1(convertBloodSugar(suggestedMg, 'mg_dl', 'mmol_l'))
            : suggestedMg;
        return { suggested, messageKey: 'typoBloodSugar' };
      }
    }
  }

  if (type === 'weight') {
    const kg = weightToKg(value, unit);
    if (kg >= 400 && kg <= 5000) {
      const suggestedKg = round1(kg / 10);
      if (suggestedKg >= HARD.weight_kg.min && suggestedKg <= HARD.weight_kg.max) {
        const suggested =
          unit === 'lbs' ? round1(convertWeight(suggestedKg, 'kg', 'lbs')) : suggestedKg;
        return { suggested, messageKey: 'typoWeight' };
      }
    }
  }

  if (type === 'body_temperature' && unit === 'c') {
    // 370 → 37.0
    if (value >= 300 && value <= 450) {
      const suggested = round1(value / 10);
      if (suggested >= HARD.body_temperature_c.min && suggested <= HARD.body_temperature_c.max) {
        return { suggested, messageKey: 'typoTemperature' };
      }
    }
  }

  return null;
}

function softUnusualSingle(
  value: number,
  low: number | undefined,
  high: number | undefined,
): boolean {
  if (low != null && value < low) return true;
  if (high != null && value > high) return true;
  return false;
}

function trendIssue(
  type: VitalType,
  current: { value?: number; systolic?: number; diastolic?: number },
  previous: VitalEntry | undefined,
): VitalIssue | null {
  if (!previous) return null;

  if (type === 'weight' && current.value != null) {
    const prev = entryWeightKg(previous);
    if (prev == null) return null;
    const delta = Math.abs(current.value - prev);
    if (delta >= TREND.weight_kg_delta || delta / Math.max(prev, 1) >= TREND.weight_kg_ratio) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendWeight',
        params: { previous: round1(prev), unit: 'kg' },
      };
    }
  }

  if (type === 'blood_pressure' && current.systolic != null && current.diastolic != null) {
    if (previous.systolic == null || previous.diastolic == null) return null;
    if (
      Math.abs(current.systolic - previous.systolic) >= TREND.blood_pressure_sys_delta ||
      Math.abs(current.diastolic - previous.diastolic) >= TREND.blood_pressure_dia_delta
    ) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendBloodPressure',
        params: {
          previous: `${round1(previous.systolic)}/${round1(previous.diastolic)}`,
        },
      };
    }
  }

  if (type === 'heart_rate' && current.value != null && previous.value != null) {
    if (Math.abs(current.value - previous.value) >= TREND.heart_rate_delta) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendGeneric',
        params: { previous: round1(previous.value), unit: 'bpm' },
      };
    }
  }

  if (type === 'blood_sugar' && current.value != null) {
    const prev = entrySugarMgDl(previous);
    if (prev == null) return null;
    if (Math.abs(current.value - prev) >= TREND.blood_sugar_mg_dl_delta) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendGeneric',
        params: { previous: round1(prev), unit: 'mg/dL' },
      };
    }
  }

  if (type === 'body_temperature' && current.value != null) {
    const prev = entryTempC(previous);
    if (prev == null) return null;
    if (Math.abs(current.value - prev) >= TREND.body_temperature_c_delta) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendGeneric',
        params: { previous: round1(prev), unit: '°C' },
      };
    }
  }

  if (type === 'oxygen_saturation' && current.value != null && previous.value != null) {
    if (Math.abs(current.value - previous.value) >= TREND.oxygen_saturation_delta) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendOxygen',
        params: { previous: round1(previous.value) },
      };
    }
  }

  if (type === 'respiratory_rate' && current.value != null && previous.value != null) {
    if (Math.abs(current.value - previous.value) >= TREND.respiratory_rate_delta) {
      return {
        code: 'trend_large_change',
        messageKey: 'trendGeneric',
        params: { previous: round1(previous.value), unit: 'breaths/min' },
      };
    }
  }

  return null;
}

/**
 * Assess a vital draft for hard blocks and soft confirms.
 * `previous` should be the latest entry of the same type (if any).
 */
export function assessVitalDraft(input: VitalDraftInput, previous?: VitalEntry): VitalAssessment {
  const soft: VitalIssue[] = [];
  const notes = input.notes?.trim() || undefined;

  if (input.type === 'blood_pressure') {
    const systolic = parsePositiveNumber(input.systolicText ?? '');
    const diastolic = parsePositiveNumber(input.diastolicText ?? '');
    if (systolic == null || diastolic == null) {
      return {
        payload: null,
        hard: { code: 'required', messageKey: 'requiredReading' },
        soft: [],
      };
    }

    const { sysMin, sysMax, diaMin, diaMax } = HARD.blood_pressure;
    if (systolic < sysMin || systolic > sysMax || diastolic < diaMin || diastolic > diaMax) {
      return {
        payload: null,
        hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
        soft: [],
      };
    }
    if (diastolic >= systolic) {
      return {
        payload: null,
        hard: { code: 'bp_diastolic_gte_systolic', messageKey: 'bpDiastolicOrder' },
        soft: [],
      };
    }

    const softBp = SOFT.blood_pressure;
    if (
      softUnusualSingle(systolic, softBp.sysLow, softBp.sysHigh) ||
      softUnusualSingle(diastolic, softBp.diaLow, softBp.diaHigh)
    ) {
      soft.push({ code: 'soft_unusual', messageKey: 'bpUnusual' });
    }

    const trend = trendIssue(
      'blood_pressure',
      { systolic, diastolic },
      previous?.type === 'blood_pressure' ? previous : undefined,
    );
    if (trend) soft.push(trend);

    return {
      payload: {
        type: 'blood_pressure',
        unit: 'mmHg',
        systolic,
        diastolic,
        notes,
      },
      hard: null,
      soft,
    };
  }

  if (input.type === 'blood_sugar' && !input.bloodSugarContext) {
    return {
      payload: null,
      hard: { code: 'blood_sugar_context_required', messageKey: 'bloodSugarContextRequired' },
      soft: [],
    };
  }

  if (input.type === 'height' && input.unit === 'ft') {
    const feet = parsePositiveNumber(input.feetText ?? '');
    const inchesRaw = input.inchesText?.trim() ? input.inchesText : '0';
    const inches = parsePositiveNumber(inchesRaw);
    if (feet == null || inches == null || inches >= 12) {
      return {
        payload: null,
        hard: { code: 'required', messageKey: 'requiredReading' },
        soft: [],
      };
    }
    const cm = heightToCm({ unit: 'ft', feet, inches });
    if (cm == null) {
      return {
        payload: null,
        hard: { code: 'required', messageKey: 'requiredReading' },
        soft: [],
      };
    }
    if (cm < HARD.height_cm.min || cm > HARD.height_cm.max) {
      return {
        payload: null,
        hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
        soft: [],
      };
    }
    if (softUnusualSingle(cm, SOFT.height_cm.low, SOFT.height_cm.high)) {
      soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
    }
    return {
      payload: {
        type: 'height',
        unit: CANONICAL.height,
        value: round1(cm),
        notes,
      },
      hard: null,
      soft,
    };
  }

  const raw = parsePositiveNumber(input.valueText ?? '');
  if (raw == null) {
    return {
      payload: null,
      hard: { code: 'required', messageKey: 'requiredReading' },
      soft: [],
    };
  }

  // Typo suggestion before hard reject when possible
  const typo = detectTypoSuggestion({ type: input.type, unit: input.unit, value: raw });
  if (typo) {
    soft.push({
      code: 'typo_suggestion',
      messageKey: typo.messageKey,
      suggestedDisplayValue: typo.suggested,
      params: { suggested: typo.suggested },
    });
  }

  switch (input.type) {
    case 'blood_sugar': {
      const mg = sugarToMgDl(raw, input.unit);
      if (mg < HARD.blood_sugar_mg_dl.min || mg > HARD.blood_sugar_mg_dl.max) {
        // If typo suggestion exists, prefer soft typo over hard when /10 is valid
        if (typo) {
          return { payload: null, hard: null, soft };
        }
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(mg, SOFT.blood_sugar_mg_dl.low, SOFT.blood_sugar_mg_dl.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'bloodSugarUnusual' });
      }
      const trend = trendIssue(
        'blood_sugar',
        { value: mg },
        previous?.type === 'blood_sugar' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: {
          type: 'blood_sugar',
          unit: CANONICAL.blood_sugar,
          value: round1(mg),
          bloodSugarContext: input.bloodSugarContext ?? undefined,
          notes,
        },
        hard: null,
        soft,
      };
    }
    case 'heart_rate': {
      if (raw < HARD.heart_rate.min || raw > HARD.heart_rate.max) {
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(raw, SOFT.heart_rate.low, SOFT.heart_rate.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
      }
      const trend = trendIssue(
        'heart_rate',
        { value: raw },
        previous?.type === 'heart_rate' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: { type: 'heart_rate', unit: 'bpm', value: raw, notes },
        hard: null,
        soft,
      };
    }
    case 'body_temperature': {
      const celsius = tempToC(raw, input.unit);
      if (celsius < HARD.body_temperature_c.min || celsius > HARD.body_temperature_c.max) {
        if (typo) {
          return { payload: null, hard: null, soft };
        }
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(celsius, SOFT.body_temperature_c.low, SOFT.body_temperature_c.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
      }
      const trend = trendIssue(
        'body_temperature',
        { value: celsius },
        previous?.type === 'body_temperature' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: {
          type: 'body_temperature',
          unit: CANONICAL.body_temperature,
          value: round1(celsius),
          notes,
        },
        hard: null,
        soft,
      };
    }
    case 'weight': {
      const kg = weightToKg(raw, input.unit);
      if (kg < HARD.weight_kg.min || kg > HARD.weight_kg.max) {
        if (typo) {
          return { payload: null, hard: null, soft };
        }
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(kg, SOFT.weight_kg.low, SOFT.weight_kg.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
      }
      const trend = trendIssue(
        'weight',
        { value: kg },
        previous?.type === 'weight' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: {
          type: 'weight',
          unit: CANONICAL.weight,
          value: round1(kg),
          notes,
        },
        hard: null,
        soft,
      };
    }
    case 'height': {
      const cm = raw;
      if (cm < HARD.height_cm.min || cm > HARD.height_cm.max) {
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(cm, SOFT.height_cm.low, SOFT.height_cm.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
      }
      return {
        payload: {
          type: 'height',
          unit: CANONICAL.height,
          value: round1(cm),
          notes,
        },
        hard: null,
        soft,
      };
    }
    case 'oxygen_saturation': {
      if (raw < HARD.oxygen_saturation.min || raw > HARD.oxygen_saturation.max) {
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (raw < SOFT.oxygen_saturation.low) {
        soft.push({ code: 'soft_unusual', messageKey: 'oxygenLow' });
      }
      const trend = trendIssue(
        'oxygen_saturation',
        { value: raw },
        previous?.type === 'oxygen_saturation' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: { type: 'oxygen_saturation', unit: 'percent', value: raw, notes },
        hard: null,
        soft,
      };
    }
    case 'respiratory_rate': {
      if (raw < HARD.respiratory_rate.min || raw > HARD.respiratory_rate.max) {
        return {
          payload: null,
          hard: { code: 'out_of_range', messageKey: 'unusualCheck' },
          soft: [],
        };
      }
      if (softUnusualSingle(raw, SOFT.respiratory_rate.low, SOFT.respiratory_rate.high)) {
        soft.push({ code: 'soft_unusual', messageKey: 'unusualConfirm' });
      }
      const trend = trendIssue(
        'respiratory_rate',
        { value: raw },
        previous?.type === 'respiratory_rate' ? previous : undefined,
      );
      if (trend) soft.push(trend);
      return {
        payload: { type: 'respiratory_rate', unit: 'breaths_min', value: raw, notes },
        hard: null,
        soft,
      };
    }
    default:
      return {
        payload: null,
        hard: { code: 'required', messageKey: 'requiredReading' },
        soft: [],
      };
  }
}

/** Apply a typo suggestion into a new draft assessment payload (canonical). */
export function applySuggestedValue(
  input: VitalDraftInput,
  suggestedDisplayValue: number,
  previous?: VitalEntry,
): VitalAssessment {
  return assessVitalDraft(
    {
      ...input,
      valueText: String(suggestedDisplayValue),
    },
    previous,
  );
}

export function getPreviousEntry(entries: VitalEntry[], type: VitalType): VitalEntry | undefined {
  return [...entries]
    .filter((entry) => entry.type === type)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
}

export function isValidVitalDraft(input: VitalDraftInput): boolean {
  const assessment = assessVitalDraft(input);
  return assessment.hard == null && assessment.payload != null;
}

export function buildVitalEntryPayload(
  input: VitalDraftInput,
): Omit<VitalEntry, 'id' | 'recordedAt'> | null {
  const assessment = assessVitalDraft(input);
  if (assessment.hard || !assessment.payload) {
    return null;
  }
  return assessment.payload;
}
