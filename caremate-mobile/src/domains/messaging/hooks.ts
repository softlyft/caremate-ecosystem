import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import { useTranslation } from '@/domains/localization';
import { listPatientConversations } from '@/domains/messaging/repository';
import { loadConversationThread } from '@/domains/messaging/sender-display';
import { useMessagingRealtime } from '@/domains/messaging/realtime';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

/** Shared inbox cache — Home badge and Messages list must stay in sync. */
const INBOX_STALE_MS = 10_000;
/** Slow safety net; Realtime invalidation is the primary refresh path. */
const INBOX_REFETCH_MS = 60_000;
const THREAD_STALE_MS = 5_000;
const THREAD_REFETCH_MS = 60_000;

function inboxQueryOptions(userId: string, isGuest: boolean) {
  return {
    queryKey: [...QUERY_KEYS.messages, userId] as const,
    queryFn: () => listPatientConversations(userId),
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
    staleTime: INBOX_STALE_MS,
    refetchInterval: INBOX_REFETCH_MS,
    refetchOnReconnect: true,
  };
}

export function useMessageInbox() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  useMessagingRealtime({
    userId,
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
  });
  return useQuery(inboxQueryOptions(userId, isGuest));
}

export function useUnreadMessageCount() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  useMessagingRealtime({
    userId,
    enabled: Boolean(userId) && !isGuest && config.isSupabaseConfigured,
  });
  return useQuery({
    ...inboxQueryOptions(userId, isGuest),
    select: (conversations) => conversations.filter((conversation) => conversation.unread).length,
  });
}

export function useConversationMessages(conversationId: string) {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const { t } = useTranslation();
  useMessagingRealtime({
    userId,
    conversationId,
    enabled: Boolean(userId) && Boolean(conversationId) && !isGuest && config.isSupabaseConfigured,
  });
  return useQuery({
    queryKey: [...QUERY_KEYS.messages, 'thread', conversationId, userId],
    queryFn: () =>
      loadConversationThread(conversationId, userId, {
        insurer: t('messages.senderRoleInsurer'),
        provider: t('messages.senderRoleProvider'),
        participant: t('messages.senderRoleParticipant'),
        careTeam: t('messages.senderRoleCareTeam'),
        you: t('messages.senderYou'),
        unknownUser: t('messages.unknownUser'),
        insurerFallback: t('messages.insurerFallback'),
        providerFallback: t('messages.providerFallback'),
      }),
    enabled: Boolean(conversationId) && !isGuest && config.isSupabaseConfigured,
    staleTime: THREAD_STALE_MS,
    refetchInterval: THREAD_REFETCH_MS,
    refetchOnReconnect: true,
  });
}
