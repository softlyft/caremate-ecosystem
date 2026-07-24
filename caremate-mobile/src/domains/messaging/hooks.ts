import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import {
  countUnreadConversations,
  listMessages,
  listPatientConversations,
} from '@/domains/messaging/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

export function useMessageInbox() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  return useQuery({
    queryKey: [...QUERY_KEYS.messages, userId],
    queryFn: () => listPatientConversations(userId),
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
    staleTime: 30_000,
  });
}

export function useUnreadMessageCount() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  return useQuery({
    queryKey: [...QUERY_KEYS.messagesUnread, userId],
    queryFn: () => countUnreadConversations(userId),
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useConversationMessages(conversationId: string) {
  const isGuest = useIsGuest();
  return useQuery({
    queryKey: [...QUERY_KEYS.messages, 'thread', conversationId],
    queryFn: () => listMessages(conversationId),
    enabled: Boolean(conversationId) && !isGuest && config.isSupabaseConfigured,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
