import type { ImmunizationProfile } from '@/mini-apps/immunization-tracker/utils';

export type FamilyImmunizationSource =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'needs_family_setup' }
  | { status: 'needs_children' }
  | { status: 'ready'; children: ImmunizationProfile[] };

export function resolveFamilyImmunizationSource(input: {
  isGuest: boolean;
  hydrated: boolean;
  householdLoading: boolean;
  childrenLoading: boolean;
  householdId: string | undefined | null;
  children: ImmunizationProfile[];
}): FamilyImmunizationSource {
  if (input.isGuest) {
    return { status: 'guest' };
  }

  if (
    !input.hydrated ||
    input.householdLoading ||
    (Boolean(input.householdId) && input.childrenLoading)
  ) {
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
