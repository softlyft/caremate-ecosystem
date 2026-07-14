import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

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

/** Family children available to assign medicines to (parents share the household list). */
export function useMedicationFamilyKids(): MedicationFamilyKidsSource {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();

  const householdQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyHousehold, userId],
    queryFn: () => familyRepository.findHouseholdForUser(userId),
    enabled: !isGuest,
  });

  const householdId = householdQuery.data?.id;

  const childrenQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, householdId, 'children'],
    queryFn: () => familyRepository.listChildren(householdId!),
    enabled: Boolean(householdId) && !isGuest,
  });

  const children = useMemo<FamilyChildOption[]>(() => {
    return (childrenQuery.data ?? []).map((child) => ({
      id: child.id,
      fullName: child.fullName,
      dateOfBirth: child.dateOfBirth,
    }));
  }, [childrenQuery.data]);

  if (isGuest) {
    return { status: 'guest' };
  }

  if (householdQuery.isLoading || (householdId && childrenQuery.isLoading)) {
    return { status: 'loading' };
  }

  if (!householdId) {
    return { status: 'needs_family_setup' };
  }

  if (children.length === 0) {
    return { status: 'needs_children' };
  }

  return { status: 'ready', children };
}
