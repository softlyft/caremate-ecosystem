import type {
  BloodSugarUnit,
  HeightUnit,
  TemperatureUnit,
  VitalEntry,
  VitalType,
  VitalUnit,
  WeightUnit,
} from '@/mini-apps/vitals-tracker/constants';
import { VITAL_TYPES } from '@/mini-apps/vitals-tracker/constants';

const MMOL_TO_MGDL = 18.0182;
const KG_TO_LBS = 2.20462;
const CM_PER_INCH = 2.54;

export function formatRecordedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function unitLabel(unit: VitalUnit): string {
  switch (unit) {
    case 'mmHg':
      return 'mmHg';
    case 'mmol_l':
      return 'mmol/L';
    case 'mg_dl':
      return 'mg/dL';
    case 'bpm':
      return 'bpm';
    case 'c':
      return '°C';
    case 'f':
      return '°F';
    case 'kg':
      return 'kg';
    case 'lbs':
      return 'lbs';
    case 'cm':
      return 'cm';
    case 'ft':
      return 'ft';
    case 'percent':
      return '%';
    case 'breaths_min':
      return 'breaths/min';
    default:
      return unit;
  }
}

export function formatVitalValue(entry: VitalEntry): string {
  if (entry.type === 'blood_pressure') {
    const sys = entry.systolic;
    const dia = entry.diastolic;
    if (sys == null || dia == null) {
      return '—';
    }
    return `${roundDisplay(sys)}/${roundDisplay(dia)} ${unitLabel(entry.unit)}`;
  }

  if (entry.type === 'height' && entry.unit === 'ft') {
    const feet = entry.feet ?? 0;
    const inches = entry.inches ?? 0;
    return `${feet}'${inches}"`;
  }

  if (entry.value == null || Number.isNaN(entry.value)) {
    return '—';
  }

  return `${roundDisplay(entry.value)} ${unitLabel(entry.unit)}`;
}

function roundDisplay(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Math.round(value * 10) / 10);
}

export function getLatestByType(entries: VitalEntry[]): Partial<Record<VitalType, VitalEntry>> {
  const latest: Partial<Record<VitalType, VitalEntry>> = {};
  const sorted = [...entries].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  for (const entry of sorted) {
    if (!latest[entry.type]) {
      latest[entry.type] = entry;
    }
  }
  return latest;
}

export function getRecentEntries(entries: VitalEntry[], limit = 12): VitalEntry[] {
  return [...entries]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, limit);
}

export function convertBloodSugar(value: number, from: BloodSugarUnit, to: BloodSugarUnit): number {
  if (from === to) return value;
  if (from === 'mmol_l' && to === 'mg_dl') return value * MMOL_TO_MGDL;
  return value / MMOL_TO_MGDL;
}

export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
): number {
  if (from === to) return value;
  if (from === 'c' && to === 'f') return (value * 9) / 5 + 32;
  return ((value - 32) * 5) / 9;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'kg' && to === 'lbs') return value * KG_TO_LBS;
  return value / KG_TO_LBS;
}

export function heightToCm(input: {
  unit: HeightUnit;
  value?: number;
  feet?: number;
  inches?: number;
}): number | null {
  if (input.unit === 'cm') {
    return input.value == null || Number.isNaN(input.value) ? null : input.value;
  }
  const feet = input.feet ?? 0;
  const inches = input.inches ?? 0;
  if (Number.isNaN(feet) || Number.isNaN(inches)) {
    return null;
  }
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function cmToHeightParts(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

export function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function isValidVitalDraft(input: {
  type: VitalType;
  unit: VitalUnit;
  valueText?: string;
  systolicText?: string;
  diastolicText?: string;
  feetText?: string;
  inchesText?: string;
}): boolean {
  if (input.type === 'blood_pressure') {
    const sys = parsePositiveNumber(input.systolicText ?? '');
    const dia = parsePositiveNumber(input.diastolicText ?? '');
    return sys != null && dia != null && sys > 0 && dia > 0;
  }

  if (input.type === 'height' && input.unit === 'ft') {
    const feet = parsePositiveNumber(input.feetText ?? '');
    const inches = parsePositiveNumber(input.inchesText ?? '0');
    return feet != null && inches != null && inches < 12;
  }

  const value = parsePositiveNumber(input.valueText ?? '');
  if (value == null) return false;
  if (input.type === 'oxygen_saturation') {
    return value <= 100;
  }
  return true;
}

export function buildVitalEntryPayload(input: {
  type: VitalType;
  unit: VitalUnit;
  valueText?: string;
  systolicText?: string;
  diastolicText?: string;
  feetText?: string;
  inchesText?: string;
  notes?: string;
}): Omit<VitalEntry, 'id' | 'recordedAt'> | null {
  if (!isValidVitalDraft(input)) {
    return null;
  }

  const notes = input.notes?.trim() || undefined;

  if (input.type === 'blood_pressure') {
    return {
      type: input.type,
      unit: 'mmHg',
      systolic: parsePositiveNumber(input.systolicText ?? '')!,
      diastolic: parsePositiveNumber(input.diastolicText ?? '')!,
      notes,
    };
  }

  if (input.type === 'height' && input.unit === 'ft') {
    return {
      type: input.type,
      unit: 'ft',
      feet: parsePositiveNumber(input.feetText ?? '')!,
      inches: parsePositiveNumber(input.inchesText ?? '0') ?? 0,
      notes,
    };
  }

  return {
    type: input.type,
    unit: input.unit,
    value: parsePositiveNumber(input.valueText ?? '')!,
    notes,
  };
}

export function orderedVitalTypes(): VitalType[] {
  return [...VITAL_TYPES];
}
