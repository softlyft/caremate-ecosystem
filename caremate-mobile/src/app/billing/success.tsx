import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AppText } from '@/components/ui/AppText';
import { QUERY_KEYS } from '@/constants/config';
import { billingRepository } from '@/domains/billing/repository';
import { palette, spacing } from '@/theme';

/**
 * Deep-link target: caremate://billing/success?reference=…
 * Verifies the charge with Paystack/Stripe, then activates Premium.
 */
export default function BillingSuccessScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const reference = (params.reference ?? params.trxref ?? '').toString().trim() || null;
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    void WebBrowser.dismissBrowser();

    let cancelled = false;
    (async () => {
      try {
        const state = await billingRepository.syncAfterCheckout({ reference });
        if (!cancelled) {
          setMessage(
            state.tier === 'free'
              ? 'Payment received. Syncing Premium…'
              : 'Premium activated. Opening your plan…',
          );
        }
      } catch {
        if (!cancelled) setMessage('Payment received. Syncing Premium status…');
        try {
          await billingRepository.pullFromRemote();
        } catch {
          // Premium screen refresh can retry.
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing', 'premium'] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ads }),
      ]);

      if (!cancelled) {
        router.replace('/(app)/profile/premium' as Href);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, queryClient]);

  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle" style={styles.title}>
        Payment received
      </AppText>
      <AppText variant="body" style={styles.subtitle}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
