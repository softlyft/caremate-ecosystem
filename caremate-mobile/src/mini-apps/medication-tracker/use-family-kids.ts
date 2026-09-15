import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { usePremiumTier } from '@/hooks/use-premium-state';
import {
  resolveMedicationFamilyKidsSource,
  type FamilyChildOption,
  type MedicationFamilyKidsSource,
} from '@/mini-apps/medication-tracker/family-source';

export type { FamilyChildOption, MedicationFamilyKidsSource };

/** Family children available for mini-apps (federated under Family Premium; over-cap hidden). */
export function useMedicationFamilyKids(): MedicationFamilyKidsSource {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const tier = usePremiumTier();

  const householdQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyHousehold, userId],
    queryFn: () => familyRepository.findHouseholdForUser(userId),
    enabled: !isGuest,
  });

  const householdId = householdQuery.data?.id;

  const childrenQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, userId, 'accessible-children', tier],
    queryFn: () => familyRepository.listVisibleAccessibleChildren(userId, tier),
    enabled: !isGuest,
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
