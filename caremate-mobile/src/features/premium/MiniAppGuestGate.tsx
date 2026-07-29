import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, Card } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export function MiniAppGuestGate() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <Card style={styles.card}>
        <AppText variant="screenTitle" style={styles.title}>
          {t('apps.signInRequiredTitle')}
        </AppText>
        <AppText variant="subtitle" style={styles.subtitle}>
          {t('profile.premium.miniAppGuestMessage')}
        </AppText>
        <Button
          label={t('common.signIn')}
          onPress={() => router.push('/(auth)/login')}
          style={styles.primaryCta}
        />
        <Button
          label={t('profile.guest.createAccount')}
          variant="secondary"
          onPress={() => router.push('/(auth)/register')}
          style={styles.secondaryCta}
        />
      </Card>
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
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: spacing.md,
  },
  title: {
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.textSecondary,
  },
  primaryCta: {
    borderRadius: radius.xl,
  },
  secondaryCta: {
    borderRadius: radius.xl,
  },
});
