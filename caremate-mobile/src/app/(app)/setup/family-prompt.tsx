import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
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
        <PressableScale
          style={[styles.primaryCta, busy ? styles.disabled : null]}
          disabled={busy}
          onPress={() => void startFamily()}
        >
          <AppText variant="button" style={styles.primaryLabel}>
            {t('setup.familyPrompt.setup')}
          </AppText>
        </PressableScale>
        <PressableScale
          style={[styles.secondaryCta, busy ? styles.disabled : null]}
          disabled={busy}
          onPress={() => void skip()}
        >
          <AppText variant="button" style={styles.secondaryLabel}>
            {t('setup.familyPrompt.notNow')}
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: palette.brandBlue,
    backgroundColor: palette.brandBlueLight,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: palette.brandBlue,
  },
  disabled: {
    opacity: 0.45,
  },
});
