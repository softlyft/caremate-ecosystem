export type MedicationFrequency = 'once-daily' | 'twice-daily' | 'three-times-daily' | 'as-needed';

export type MedicationInstructionKind = 'none' | 'with_food' | 'empty_stomach' | 'other';

export interface FrequencyOption {
  id: MedicationFrequency;
  label: string;
  /** Expected doses per day. `0` means as-needed (no fixed schedule). */
  dosesPerDay: number;
  slotLabels: string[];
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    id: 'once-daily',
    label: 'Once daily',
    dosesPerDay: 1,
    slotLabels: ['Daily dose'],
  },
  {
    id: 'twice-daily',
    label: 'Twice daily',
    dosesPerDay: 2,
    slotLabels: ['Morning', 'Evening'],
  },
  {
    id: 'three-times-daily',
    label: 'Three times daily',
    dosesPerDay: 3,
    slotLabels: ['Morning', 'Afternoon', 'Evening'],
  },
  {
    id: 'as-needed',
    label: 'As needed',
    dosesPerDay: 0,
    slotLabels: ['Dose'],
  },
];

/** Default clock times (HH:mm) by frequency. */
export const DEFAULT_SLOT_TIMES: Record<MedicationFrequency, string[]> = {
  'once-daily': ['08:00'],
  'twice-daily': ['08:00', '20:00'],
  'three-times-daily': ['08:00', '14:00', '20:00'],
  'as-needed': [],
};

/** Minutes after slot time before an untaken dose becomes "missed" (still today). */
export const MISSED_GRACE_MINUTES = 60;

export const DEFAULT_REFILL_THRESHOLD = 5;

export const INSTRUCTION_KINDS: MedicationInstructionKind[] = [
  'none',
  'with_food',
  'empty_stomach',
  'other',
];

export function getFrequencyOption(frequency: MedicationFrequency): FrequencyOption {
  return FREQUENCY_OPTIONS.find((option) => option.id === frequency) ?? FREQUENCY_OPTIONS[0]!;
}

export function defaultSlotTimesForFrequency(frequency: MedicationFrequency): string[] {
  return [...DEFAULT_SLOT_TIMES[frequency]];
}
