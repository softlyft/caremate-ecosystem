import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AppText } from '@/components/ui/AppText';
import { palette, spacing } from '@/theme';

/**
 * Deep-link target: caremate://billing/cancel
 */
export default function BillingCancelScreen() {
  useEffect(() => {
    void WebBrowser.dismissBrowser();
    router.replace('/(app)/profile/premium' as Href);
  }, []);

  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle" style={styles.title}>
        Checkout cancelled
      </AppText>
      <AppText variant="body" style={styles.subtitle}>
        Returning to Premium…
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
