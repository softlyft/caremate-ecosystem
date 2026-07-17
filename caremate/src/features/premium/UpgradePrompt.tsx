import { router } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type UpgradePromptProps = {
  title: string;
  message: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function UpgradePrompt({ title, message, compact = false, style }: UpgradePromptProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.shell, compact ? styles.shellCompact : null, shadow.soft, style]}>
      <View style={styles.iconWrap}>
        <Crown color="#B45309" size={compact ? 18 : 22} strokeWidth={2.2} />
      </View>
      <View style={styles.copy}>
        <AppText variant={compact ? 'caption' : 'cardTitle'} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="quickActionSubtitle" style={styles.message}>
          {message}
        </AppText>
      </View>
      <PressableScale
        style={styles.cta}
        onPress={() => router.push('/(app)/profile/premium')}
        accessibilityRole="button"
        accessibilityLabel={t('profile.premium.upgradeCta')}
      >
        <AppText variant="caption" style={styles.ctaLabel}>
          {t('profile.premium.upgradeCta')}
        </AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.22)',
    backgroundColor: '#FFFBEB',
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  shellCompact: {
    padding: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 4,
  },
  title: {
    color: '#92400E',
  },
  message: {
    color: palette.textSecondary,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#D97706',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
