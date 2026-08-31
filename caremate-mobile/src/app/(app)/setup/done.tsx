import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { getDeviceDefaults } from '@/domains/onboarding';
import type { DeviceDefaults } from '@/domains/onboarding';
import { fontFamily, palette, radius, spacing } from '@/theme';

export default function SetupDoneScreen() {
  const { t } = useTranslation();
  const [defaults, setDefaults] = useState<DeviceDefaults | null>(null);

  useEffect(() => {
    void getDeviceDefaults().then(setDefaults);
  }, []);

  const checks = [
    {
      key: 'countryLanguage',
      label: t('setup.done.checks.countryLanguage'),
      done: Boolean(defaults?.countryCode) && Boolean(defaults?.languageCode),
    },
    {
      key: 'location',
      label: t('setup.done.checks.location'),
      done: Boolean(defaults?.locationMode),
    },
    {
      key: 'notifications',
      label: t('setup.done.checks.notifications'),
      done: defaults != null,
    },
    {
      key: 'emergency',
      label: t('setup.done.checks.emergency'),
      done: Boolean(defaults?.emergencyEssentialsDone),
      deferred: defaults?.priorities.includes('emergency'),
    },
    {
      key: 'family',
      label: t('setup.done.checks.family'),
      done: Boolean(defaults?.familyPromptDone),
      deferred: defaults?.priorities.includes('family'),
    },
  ];

  return (
    <Screen padded={false}>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <AppText variant="caption" style={styles.eyebrow}>
          {t('setup.done.eyebrow')}
        </AppText>
        <AppText variant="screenTitle" style={styles.title}>
          {t('setup.done.title')}
        </AppText>
        <AppText variant="subtitle" style={styles.subtitle}>
          {t('setup.done.subtitle')}
        </AppText>

        <View style={styles.card}>
          {checks.map((item) => {
            if (item.deferred === false) {
              return null;
            }
            if (item.deferred === undefined || item.deferred === true) {
              return (
                <View key={item.key} style={styles.checkRow}>
                  <View style={[styles.dot, item.done ? styles.dotDone : styles.dotPending]} />
                  <AppText variant="body" style={styles.checkLabel}>
                    {item.label}
                    {!item.done ? t('setup.done.finishLater') : ''}
                  </AppText>
                </View>
              );
            }
            return null;
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label={t('setup.done.openHome')}
          onPress={() => router.replace('/(app)/(tabs)')}
          style={styles.primaryCta}
        />
      </View>
    </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
});
