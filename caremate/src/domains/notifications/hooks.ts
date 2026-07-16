import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { notificationRepository } from '@/domains/notifications/repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';

export function useNotificationsInbox() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, userId],
    queryFn: () => notificationRepository.listForUser(userId),
  });
}

export function useUnreadNotificationCount() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: [...QUERY_KEYS.notificationsUnread, userId],
    queryFn: () => notificationRepository.countUnread(userId),
    refetchInterval: 30_000,
  });
}
