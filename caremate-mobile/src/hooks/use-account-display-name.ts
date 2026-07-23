import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { emergencyRepository } from '@/domains/emergency/repository';
import {
  resolveAccountDisplayName,
  resolveAccountFirstName,
} from '@/domains/profile/display-name';
import { profileRepository } from '@/domains/profile/repository';
import { useAuthStore } from '@/features/auth/store';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

/**
 * Shared Home / Me identity: same full name and first-name greeting source.
 */
export function useAccountDisplayName() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const email = useAuthStore((state) => state.user?.email ?? null);

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const emergencyQuery = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const profileFullName = profileQuery.data?.fullName ?? null;
  const emergencyFullName = emergencyQuery.data?.fullName ?? null;
  const resolvedEmail = profileQuery.data?.email ?? email;

  const fullName = isGuest
    ? null
    : resolveAccountDisplayName({
        profileFullName,
        emergencyFullName,
        email: resolvedEmail,
      });

  const firstName = isGuest
    ? null
    : resolveAccountFirstName({
        profileFullName,
        emergencyFullName,
        email: resolvedEmail,
      });

  return {
    isGuest,
    userId,
    email: resolvedEmail,
    fullName,
    firstName,
    profileQuery,
    emergencyQuery,
  };
}
