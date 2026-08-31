'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';

/**
 * Subscribe to new messages in an org/payer broadcast thread via Supabase Realtime.
 */
export function useOrgMessageThreadRealtime(
  conversationId: string,
  onUpdate: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || !conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`org-message-thread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          onUpdate();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, onUpdate]);
}
