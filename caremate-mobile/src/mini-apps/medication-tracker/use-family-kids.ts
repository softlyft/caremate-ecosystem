import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import {
  resolveMedicationFamilyKidsSource,
  type FamilyChildOption,
  type MedicationFamilyKidsSource,
} from '@/mini-apps/medication-tracker/family-source';

export type { FamilyChildOption, MedicationFamilyKidsSource };

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

  return resolveMedicationFamilyKidsSource({
    isGuest,
    householdLoading: householdQuery.isLoading,
    childrenLoading: childrenQuery.isLoading,
    householdId,
    children,
  });
}
