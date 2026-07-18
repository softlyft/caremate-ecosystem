export type FamilyChildOption = {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
};

export type MedicationFamilyKidsSource =
  | { status: 'guest' }
  | { status: 'loading' }
  | { status: 'needs_family_setup' }
  | { status: 'needs_children' }
  | { status: 'ready'; children: FamilyChildOption[] };

export function resolveMedicationFamilyKidsSource(input: {
  isGuest: boolean;
  householdLoading: boolean;
  childrenLoading: boolean;
  householdId: string | undefined | null;
  children: FamilyChildOption[];
}): MedicationFamilyKidsSource {
  if (input.isGuest) {
    return { status: 'guest' };
  }

  if (input.householdLoading || (Boolean(input.householdId) && input.childrenLoading)) {
    return { status: 'loading' };
  }

  if (!input.householdId) {
    return { status: 'needs_family_setup' };
  }

  if (input.children.length === 0) {
    return { status: 'needs_children' };
  }

  return { status: 'ready', children: input.children };
}
