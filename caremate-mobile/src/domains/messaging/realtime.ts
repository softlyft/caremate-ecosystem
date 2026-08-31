import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import { supabase } from '@/lib/supabase';

type SharedChannel = {
  channel: RealtimeChannel;
  refCount: number;
};

const inboxChannels = new Map<string, SharedChannel>();
const threadChannels = new Map<string, SharedChannel>();

function invalidateInbox(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
}

function invalidateThread(queryClient: QueryClient, conversationId: string) {
  void queryClient.invalidateQueries({
    queryKey: [...QUERY_KEYS.messages, 'thread', conversationId],
  });
  invalidateInbox(queryClient);
}

function acquireInboxChannel(userId: string, queryClient: QueryClient): SharedChannel {
  const existing = inboxChannels.get(userId);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const channel = supabase
    .channel(`messaging-inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_conversations' },
      () => {
        invalidateInbox(queryClient);
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_messages' },
      () => {
        invalidateInbox(queryClient);
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_participants',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        invalidateInbox(queryClient);
      },
    )
    .subscribe();

  const shared: SharedChannel = { channel, refCount: 1 };
  inboxChannels.set(userId, shared);
  return shared;
}

function releaseInboxChannel(userId: string) {
  const shared = inboxChannels.get(userId);
  if (!shared) return;
  shared.refCount -= 1;
  if (shared.refCount > 0) return;
  inboxChannels.delete(userId);
  void supabase.removeChannel(shared.channel);
}

function acquireThreadChannel(conversationId: string, queryClient: QueryClient): SharedChannel {
  const existing = threadChannels.get(conversationId);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const channel = supabase
    .channel(`messaging-thread:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        invalidateThread(queryClient, conversationId);
      },
    )
    .subscribe();

  const shared: SharedChannel = { channel, refCount: 1 };
  threadChannels.set(conversationId, shared);
  return shared;
}

function releaseThreadChannel(conversationId: string) {
  const shared = threadChannels.get(conversationId);
  if (!shared) return;
  shared.refCount -= 1;
  if (shared.refCount > 0) return;
  threadChannels.delete(conversationId);
  void supabase.removeChannel(shared.channel);
}

/**
 * Keep message React Query caches fresh via Supabase Realtime.
 * Shared across inbox / unread / thread hooks (ref-counted channels).
 * Polling remains a slow safety net when the socket drops.
 */
export function useMessagingRealtime(options: {
  userId: string | null | undefined;
  conversationId?: string | null;
  enabled: boolean;
}): void {
  const { userId, conversationId, enabled } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !config.isSupabaseConfigured || !userId) {
      return;
    }

    acquireInboxChannel(userId, queryClient);
    if (conversationId) {
      acquireThreadChannel(conversationId, queryClient);
    }

    return () => {
      releaseInboxChannel(userId);
      if (conversationId) {
        releaseThreadChannel(conversationId);
      }
    };
  }, [enabled, userId, conversationId, queryClient]);
}
