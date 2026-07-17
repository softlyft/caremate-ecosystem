import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export function MiniAppGuestGate() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={[styles.card, shadow.soft]}>
        <AppText variant="screenTitle" style={styles.title}>
          {t('apps.signInRequiredTitle')}
        </AppText>
        <AppText variant="subtitle" style={styles.subtitle}>
          {t('profile.premium.miniAppGuestMessage')}
        </AppText>
        <PressableScale style={styles.primaryCta} onPress={() => router.push('/(auth)/login')}>
          <AppText variant="button" style={styles.primaryLabel}>
            {t('common.signIn')}
          </AppText>
        </PressableScale>
        <PressableScale
          style={styles.secondaryCta}
          onPress={() => router.push('/(auth)/register')}
        >
          <AppText variant="button" style={styles.secondaryLabel}>
            {t('profile.guest.createAccount')}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: layoutSpacing.cardPadding,
    gap: spacing.md,
  },
  title: {
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.textSecondary,
  },
  primaryCta: {
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: palette.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: palette.primary,
  },
});
