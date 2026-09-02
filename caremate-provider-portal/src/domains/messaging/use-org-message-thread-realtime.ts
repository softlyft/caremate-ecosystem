'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';

/**
 * Subscribe to new messages in an org/payer broadcast thread via Supabase Realtime.
 * Authenticates the Realtime socket with the portal session so RLS-scoped
 * postgres_changes are delivered (anon sockets receive no participant events).
 */
export function useOrgMessageThreadRealtime(
  conversationId: string,
  onUpdate: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || !conversationId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    async function bindRealtimeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    }

    void (async () => {
      await bindRealtimeAuth();
      if (cancelled) return;

      channel = supabase
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
    })();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, onUpdate]);
}
