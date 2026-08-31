'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';

/**
 * Re-fetch server-rendered provider↔payer connection pages when the peer org
 * creates, approves, rejects, or disconnects a link.
 */
export function ProviderPayerConnectionsLiveRefresh({
  organizationId,
  side,
}: {
  organizationId: string;
  side: 'provider' | 'payer';
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.refresh();
    }, 300);
  }, [router]);

  useEffect(() => {
    if (!organizationId) return;

    const supabase = createClient();
    const column = side === 'provider' ? 'provider_organization_id' : 'payer_organization_id';
    const channel = supabase
      .channel(`provider-payer-connections:${side}:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_payer_connections',
          filter: `${column}=eq.${organizationId}`,
        },
        () => {
          scheduleRefresh();
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, side, scheduleRefresh]);

  return null;
}
