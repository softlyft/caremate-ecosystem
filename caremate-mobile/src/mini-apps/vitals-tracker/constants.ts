export const VITAL_TYPES = [
  'blood_pressure',
  'blood_sugar',
  'heart_rate',
  'body_temperature',
  'weight',
  'height',
  'oxygen_saturation',
  'respiratory_rate',
] as const;

export type VitalType = (typeof VITAL_TYPES)[number];

export type BloodSugarUnit = 'mmol_l' | 'mg_dl';
export type TemperatureUnit = 'c' | 'f';
export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'ft';

export const BLOOD_SUGAR_CONTEXTS = [
  'fasting',
  'before_meal',
  'two_hours_after_meal',
  'random',
] as const;

export type BloodSugarContext = (typeof BLOOD_SUGAR_CONTEXTS)[number];

export type VitalSource = 'manual' | 'device';

export type BloodPressurePosition = 'sitting' | 'standing' | 'lying';

export type VitalUnit =
  | 'mmHg'
  | BloodSugarUnit
  | 'bpm'
  | TemperatureUnit
  | WeightUnit
  | HeightUnit
  | 'percent'
  | 'breaths_min';

export interface VitalUnitPrefs {
  blood_sugar: BloodSugarUnit;
  body_temperature: TemperatureUnit;
  weight: WeightUnit;
  height: HeightUnit;
}

export const DEFAULT_UNIT_PREFS: VitalUnitPrefs = {
  blood_sugar: 'mg_dl',
  body_temperature: 'c',
  weight: 'kg',
  height: 'cm',
};

export interface VitalEntry {
  id: string;
  type: VitalType;
  recordedAt: string;
  unit: VitalUnit;
  /** Single-value vitals (not BP). Stored in canonical units when possible. */
  value?: number;
  systolic?: number;
  diastolic?: number;
  /** Legacy height in feet+inches when unit is `ft` (new entries store cm). */
  feet?: number;
  inches?: number;
  /** Required for blood sugar interpretation. */
  bloodSugarContext?: BloodSugarContext;
  /** How the reading was captured. */
  source?: VitalSource;
  /** Optional BP posture context. */
  bpPosition?: BloodPressurePosition;
  /** Optional connected / home device label. */
  deviceName?: string;
  notes?: string;
}

export const VITAL_TYPE_META: Record<
  VitalType,
  {
    defaultUnit: VitalUnit;
    hasUnitPicker: boolean;
  }
> = {
  blood_pressure: { defaultUnit: 'mmHg', hasUnitPicker: false },
  blood_sugar: { defaultUnit: 'mg_dl', hasUnitPicker: true },
  heart_rate: { defaultUnit: 'bpm', hasUnitPicker: false },
  body_temperature: { defaultUnit: 'c', hasUnitPicker: true },
  weight: { defaultUnit: 'kg', hasUnitPicker: true },
  height: { defaultUnit: 'cm', hasUnitPicker: true },
  oxygen_saturation: { defaultUnit: 'percent', hasUnitPicker: false },
  respiratory_rate: { defaultUnit: 'breaths_min', hasUnitPicker: false },
};
