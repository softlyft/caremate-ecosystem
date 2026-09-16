import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { usePremiumTier } from '@/hooks/use-premium-state';
import {
  resolveFamilyImmunizationSource,
  type FamilyImmunizationSource,
} from '@/mini-apps/immunization-tracker/family-source';
import {
  useImmunizationTrackerHydrated,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import {
  isValidImmunizationProfile,
  type ImmunizationProfile,
} from '@/mini-apps/immunization-tracker/utils';

export type { FamilyImmunizationSource };

/**
 * Loads family household children into the immunization tracker.
 * Under Family Premium, includes federated kids from linked adults (over-cap hidden by tier).
 */
export function useFamilyImmunizationChildren(): FamilyImmunizationSource {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const tier = usePremiumTier();
  const hydrated = useImmunizationTrackerHydrated();
  const syncProfilesFromFamily = useImmunizationTrackerStore((s) => s.syncProfilesFromFamily);

  const householdQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyHousehold, userId],
    queryFn: () => familyRepository.findHouseholdForUser(userId),
    enabled: !isGuest && hydrated,
  });

  const householdId = householdQuery.data?.id;

  const childrenQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, userId, 'accessible-children', tier],
    queryFn: () => familyRepository.listVisibleAccessibleChildren(userId, tier),
    enabled: !isGuest && hydrated,
  });

  const children = useMemo<ImmunizationProfile[]>(() => {
    return (childrenQuery.data ?? [])
      .map((child) => ({
        id: child.id,
        name: child.fullName,
        dateOfBirth: child.dateOfBirth ?? '',
      }))
      .filter(isValidImmunizationProfile);
  }, [childrenQuery.data]);

  useEffect(() => {
    if (isGuest || !hydrated) {
      return;
    }
    if (
      householdQuery.isSuccess &&
      !householdId &&
      childrenQuery.isSuccess &&
      children.length === 0
    ) {
      syncProfilesFromFamily([]);
      return;
    }
    if (childrenQuery.isSuccess) {
      syncProfilesFromFamily(children);
    }
  }, [
    children,
    childrenQuery.isSuccess,
    hydrated,
    householdId,
    householdQuery.isSuccess,
    isGuest,
    syncProfilesFromFamily,
  ]);

  return resolveFamilyImmunizationSource({
    isGuest,
    hydrated,
    householdLoading: householdQuery.isLoading,
    childrenLoading: childrenQuery.isLoading,
    householdId,
    children,
  });
}
