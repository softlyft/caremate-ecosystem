import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import {
  useImmunizationTrackerHydrated,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import type { ImmunizationProfile } from '@/mini-apps/immunization-tracker/utils';

export type FamilyImmunizationSource =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'needs_family_setup' }
  | { status: 'needs_children' }
  | { status: 'ready'; children: ImmunizationProfile[] };

/**
 * Loads family household children into the immunization tracker.
 * Children are managed only via Family setup — not added in this mini-app.
 */
export function useFamilyImmunizationChildren(): FamilyImmunizationSource {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const hydrated = useImmunizationTrackerHydrated();
  const syncProfilesFromFamily = useImmunizationTrackerStore((s) => s.syncProfilesFromFamily);

  const householdQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyHousehold, userId],
    queryFn: () => familyRepository.findHouseholdForUser(userId),
    enabled: !isGuest && hydrated,
  });

  const householdId = householdQuery.data?.id;

  const childrenQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, householdId, 'children'],
    queryFn: () => familyRepository.listChildren(householdId!),
    enabled: Boolean(householdId) && !isGuest && hydrated,
  });

  const children = useMemo<ImmunizationProfile[]>(() => {
    return (childrenQuery.data ?? [])
      .filter((child) => Boolean(child.dateOfBirth?.trim()))
      .map((child) => ({
        id: child.id,
        name: child.fullName,
        dateOfBirth: child.dateOfBirth!,
      }));
  }, [childrenQuery.data]);

  useEffect(() => {
    if (isGuest || !hydrated) {
      return;
    }
    if (householdQuery.isSuccess && !householdId) {
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

  if (isGuest) {
    return { status: 'guest' };
  }

  if (!hydrated || householdQuery.isLoading || (householdId && childrenQuery.isLoading)) {
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
