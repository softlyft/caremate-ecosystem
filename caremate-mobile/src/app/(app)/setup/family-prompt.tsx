import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { markFamilyPromptDone } from '@/domains/onboarding';
import { fontFamily, palette, radius, spacing } from '@/theme';

export default function SetupFamilyPromptScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function skip() {
    setBusy(true);
    try {
      const href = await markFamilyPromptDone();
      router.replace(href);
    } finally {
      setBusy(false);
    }
  }

  async function startFamily() {
    setBusy(true);
    try {
      await markFamilyPromptDone();
      router.replace('/(app)/family/setup');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <AppText variant="caption" style={styles.eyebrow}>
            {t('profile.menu.family')}
          </AppText>
          <AppText variant="screenTitle" style={styles.title}>
            {t('setup.familyPrompt.title')}
          </AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {t('setup.familyPrompt.subtitle')}
          </AppText>
        </View>

        <View style={styles.footer}>
          <Button
            label={t('setup.familyPrompt.setup')}
            style={styles.primaryCta}
            loading={busy}
            onPress={() => void startFamily()}
          />
          <Button
            label={t('setup.familyPrompt.notNow')}
            variant="secondary"
            style={styles.secondaryCta}
            disabled={busy}
            onPress={() => void skip()}
            textStyle={styles.secondaryLabel}
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
    color: palette.brandBlue,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    fontSize: 11,
  },
  title: {
    color: palette.brandBlue,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  primaryCta: {
    backgroundColor: palette.brandBlue,
    borderRadius: radius.xl,
  },
  secondaryCta: {
    borderRadius: radius.xl,
    borderColor: palette.brandBlue,
    backgroundColor: palette.brandBlueLight,
  },
  secondaryLabel: {
    color: palette.brandBlue,
  },
});
