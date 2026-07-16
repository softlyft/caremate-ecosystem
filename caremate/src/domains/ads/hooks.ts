import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { resolveAdForSlot } from '@/domains/ads/resolver';
import type { AdSlotId } from '@/domains/ads/types';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

export function useAdForSlot(slotId: AdSlotId) {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();

  return useQuery({
    queryKey: [...QUERY_KEYS.ads, slotId, userId, isGuest],
    queryFn: () =>
      resolveAdForSlot({
        slotId,
        userId: isGuest ? null : userId,
        isGuest,
      }),
    staleTime: 60_000,
  });
}
