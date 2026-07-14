export type MedicationFrequency = 'once-daily' | 'twice-daily' | 'three-times-daily' | 'as-needed';

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

export function getFrequencyOption(frequency: MedicationFrequency): FrequencyOption {
  return FREQUENCY_OPTIONS.find((option) => option.id === frequency) ?? FREQUENCY_OPTIONS[0];
}
