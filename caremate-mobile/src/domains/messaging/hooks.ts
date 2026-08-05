import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import { listMessages, listPatientConversations } from '@/domains/messaging/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

/** Shared inbox cache — Home badge and Messages list must stay in sync. */
const INBOX_STALE_MS = 15_000;
const INBOX_REFETCH_MS = 30_000;

function inboxQueryOptions(userId: string, isGuest: boolean) {
  return {
    queryKey: [...QUERY_KEYS.messages, userId] as const,
    queryFn: () => listPatientConversations(userId),
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
    staleTime: INBOX_STALE_MS,
    refetchInterval: INBOX_REFETCH_MS,
  };
}

export function useMessageInbox() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  return useQuery(inboxQueryOptions(userId, isGuest));
}

export function useUnreadMessageCount() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  return useQuery({
    ...inboxQueryOptions(userId, isGuest),
    select: (conversations) => conversations.filter((conversation) => conversation.unread).length,
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
