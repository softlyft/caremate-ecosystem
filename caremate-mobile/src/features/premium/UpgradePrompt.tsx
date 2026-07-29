import { router } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Card } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { palette, radius, spacing } from '@/theme';

type UpgradePromptProps = {
  title: string;
  message: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function UpgradePrompt({ title, message, compact = false, style }: UpgradePromptProps) {
  const { t } = useTranslation();

  return (
    <Card
      padded={!compact}
      style={[styles.shell, compact ? styles.shellCompact : null, style]}
    >
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
      <Button
        label={t('profile.premium.upgradeCta')}
        size="sm"
        style={styles.cta}
        textStyle={styles.ctaLabel}
        onPress={() => router.push('/(app)/profile/premium')}
        accessibilityLabel={t('profile.premium.upgradeCta')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: 'rgba(180, 83, 9, 0.22)',
    backgroundColor: '#FFFBEB',
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
    minHeight: undefined,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
