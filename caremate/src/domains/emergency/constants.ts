export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type Genotype = (typeof GENOTYPES)[number];

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function joinFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}
