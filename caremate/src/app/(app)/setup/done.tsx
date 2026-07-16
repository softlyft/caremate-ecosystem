import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { getDeviceDefaults } from '@/domains/onboarding';
import type { DeviceDefaults } from '@/domains/onboarding';
import { fontFamily, palette, radius, spacing } from '@/theme';

export default function SetupDoneScreen() {
  const [defaults, setDefaults] = useState<DeviceDefaults | null>(null);

  useEffect(() => {
    void getDeviceDefaults().then(setDefaults);
  }, []);

  const checks = [
    {
      label: 'Region for local news',
      done: Boolean(defaults?.countryCode) && !defaults?.regionSkipped,
    },
    {
      label: 'Nearby location preference',
      done: Boolean(defaults?.locationMode),
    },
    {
      label: 'Notification preference',
      done: defaults != null,
    },
    {
      label: 'Emergency essentials',
      done: Boolean(defaults?.emergencyEssentialsDone),
      deferred: defaults?.priorities.includes('emergency'),
    },
    {
      label: 'Family setup',
      done: Boolean(defaults?.familyPromptDone),
      deferred: defaults?.priorities.includes('family'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <AppText variant="caption" style={styles.eyebrow}>
          All set
        </AppText>
        <AppText variant="screenTitle" style={styles.title}>
          You’re ready
        </AppText>
        <AppText variant="subtitle" style={styles.subtitle}>
          Finish anything you skipped later from Profile. CareMate works offline with what you’ve
          saved on this device.
        </AppText>

        <View style={styles.card}>
          {checks.map((item) => {
            if (item.deferred === false) {
              return null;
            }
            if (item.deferred === undefined || item.deferred === true) {
              return (
                <View key={item.label} style={styles.checkRow}>
                  <View style={[styles.dot, item.done ? styles.dotDone : styles.dotPending]} />
                  <AppText variant="body" style={styles.checkLabel}>
                    {item.label}
                    {!item.done ? ' — finish later' : ''}
                  </AppText>
                </View>
              );
            }
            return null;
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <PressableScale
          style={styles.primaryCta}
          onPress={() => router.replace('/(app)/(tabs)')}
        >
          <AppText variant="button" style={styles.primaryLabel}>
            Open Home
          </AppText>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: palette.primary,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    fontSize: 11,
  },
  title: {
    color: palette.primaryDark,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.textSecondary,
  },
  card: {
    marginTop: spacing.md,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDone: {
    backgroundColor: palette.primary,
  },
  dotPending: {
    backgroundColor: palette.divider,
  },
  checkLabel: {
    flex: 1,
    color: palette.text,
  },
  footer: {
    padding: spacing.lg,
  },
  primaryCta: {
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
});
