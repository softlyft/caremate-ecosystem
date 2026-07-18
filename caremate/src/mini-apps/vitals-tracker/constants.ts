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
  blood_sugar: 'mmol_l',
  body_temperature: 'c',
  weight: 'kg',
  height: 'cm',
};

export interface VitalEntry {
  id: string;
  type: VitalType;
  recordedAt: string;
  unit: VitalUnit;
  /** Single-value vitals (not BP / not height-in-ft). */
  value?: number;
  systolic?: number;
  diastolic?: number;
  /** Height in feet+inches when unit is `ft`. */
  feet?: number;
  inches?: number;
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
  blood_sugar: { defaultUnit: 'mmol_l', hasUnitPicker: true },
  heart_rate: { defaultUnit: 'bpm', hasUnitPicker: false },
  body_temperature: { defaultUnit: 'c', hasUnitPicker: true },
  weight: { defaultUnit: 'kg', hasUnitPicker: true },
  height: { defaultUnit: 'cm', hasUnitPicker: true },
  oxygen_saturation: { defaultUnit: 'percent', hasUnitPicker: false },
  respiratory_rate: { defaultUnit: 'breaths_min', hasUnitPicker: false },
};
