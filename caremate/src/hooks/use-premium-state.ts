import { useQuery } from '@tanstack/react-query';

import {
  emptyPremiumState,
  getPremiumState,
  type PremiumState,
} from '@/domains/billing/entitlement';
import type { PremiumTier } from '@/domains/billing/types';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

/**
 * Canonical React Query source for premium entitlement.
 * Cache key `['billing', 'premium', userId, isGuest]` MUST store flat `PremiumState` only.
 * Do not put wrapped objects (e.g. `{ premium, householdId }`) under this key.
 */
export function usePremiumState() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();

  const query = useQuery({
    queryKey: ['billing', 'premium', userId, isGuest],
    enabled: !isGuest,
    queryFn: () => getPremiumState(userId),
    staleTime: 60_000,
  });

  const state: PremiumState = isGuest ? emptyPremiumState() : (query.data ?? emptyPremiumState());

  return {
    ...query,
    isGuest,
    state,
    tier: state.tier,
  };
}

export function usePremiumTier(): PremiumTier {
  return usePremiumState().tier;
}
