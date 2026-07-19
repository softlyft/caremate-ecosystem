import type { ProviderOrgType } from '@/types/database';

export const ORG_TYPES = [
  'hospital',
  'clinic',
  'pharmacy',
  'laboratory',
  'imaging_centre',
  'blood_bank',
  'ambulance',
  'insurance',
] as const satisfies readonly ProviderOrgType[];

export const ORG_TYPE_LABELS: Record<ProviderOrgType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  imaging_centre: 'Imaging Centre',
  blood_bank: 'Blood Bank',
  ambulance: 'Ambulance Service',
  insurance: 'Insurance / HMO',
};

export function isOrgType(value: unknown): value is ProviderOrgType {
  return typeof value === 'string' && (ORG_TYPES as readonly string[]).includes(value);
}
