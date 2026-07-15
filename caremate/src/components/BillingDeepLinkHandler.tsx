import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { billingRepository } from '@/domains/billing/repository';
import { config } from '@/constants/env';

function isBillingCallback(url: string): boolean {
  return url.includes('billing/success') || url.includes('billing/cancel');
}

/**
 * Handles return deep links from Paystack / Stripe hosted checkout.
 */
export function BillingDeepLinkHandler() {
  const handledInitial = useRef(false);

  useEffect(() => {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const handle = async (url: string) => {
      if (!isBillingCallback(url)) return;

      try {
        await billingRepository.pullFromRemote();
      } catch {
        // Offline / webhook lag — paywall refresh will retry.
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
  }, []);

  return null;
}
