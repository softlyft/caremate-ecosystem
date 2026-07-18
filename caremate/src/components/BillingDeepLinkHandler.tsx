import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import { billingRepository } from '@/domains/billing/repository';

function isBillingCallback(url: string): boolean {
  return url.includes('billing/success') || url.includes('billing/cancel');
}

function readReference(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const ref = parsed.queryParams?.reference ?? parsed.queryParams?.trxref;
    if (typeof ref === 'string' && ref.trim()) return ref.trim();
    if (Array.isArray(ref) && typeof ref[0] === 'string') return ref[0].trim();
  } catch {
    // Fall through
  }
  return null;
}

/**
 * Fallback when a billing deep link arrives while the route screen may not remount.
 * Primary path is `app/billing/success|cancel.tsx`.
 */
export function BillingDeepLinkHandler() {
  const queryClient = useQueryClient();
  const handledInitial = useRef(false);

  useEffect(() => {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const handle = async (url: string) => {
      if (!isBillingCallback(url)) return;

      void WebBrowser.dismissBrowser();

      if (url.includes('billing/success')) {
        const reference = readReference(url);
        try {
          await billingRepository.syncAfterCheckout({ reference });
        } catch {
          try {
            await billingRepository.pullFromRemote();
          } catch {
            // Premium refresh can retry.
          }
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['billing', 'premium'] }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ads }),
        ]);
      }

      router.replace('/(app)/profile/premium' as Href);
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handle(url);
    });

    if (!handledInitial.current) {
      handledInitial.current = true;
      void Linking.getInitialURL().then((url) => {
        if (url) {
          return handle(url);
        }
      });
    }

    return () => {
      sub.remove();
    };
  }, [queryClient]);

  return null;
}
