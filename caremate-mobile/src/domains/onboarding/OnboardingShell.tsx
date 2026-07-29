import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Button } from '@/components/ui/form-controls';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

import { ONBOARDING_STEP_THEMES } from './themes';
import { useTranslation } from '@/domains/localization';

const TOTAL_PHASE_A_STEPS = 6;

type OnboardingShellProps = PropsWithChildren<{
  step: number;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  onSkip?: () => void;
  skipLabel?: string;
  showBack?: boolean;
  /** Disables back/skip while an async foot action runs. */
  busy?: boolean;
  hero?: ReactNode;
}>;

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  footer,
  onSkip,
  skipLabel,
  showBack = true,
  busy = false,
  hero,
}: OnboardingShellProps) {
  const { t } = useTranslation();
  const theme = ONBOARDING_STEP_THEMES[step] ?? ONBOARDING_STEP_THEMES[0];
  const progress = useSharedValue((step + 1) / TOTAL_PHASE_A_STEPS);

  useEffect(() => {
    progress.value = withSpring((step + 1) / TOTAL_PHASE_A_STEPS, {
      damping: 18,
      stiffness: 120,
    });
  }, [progress, step]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.root}>
      <LinearGradientFill
        colors={[
          { offset: '0%', color: theme.soft },
          { offset: '45%', color: theme.softEnd },
          { offset: '100%', color: palette.surface },
        ]}
        angle={165}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.meshBlob, { backgroundColor: theme.blob }]} />
      <View
        pointerEvents="none"
        style={[styles.meshBlobSm, { backgroundColor: theme.accent, opacity: 0.12 }]}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {showBack && step > 0 ? (
            <Button
              onPress={() => router.back()}
              hitSlop={8}
              disabled={busy}
              style={[
                styles.topChip,
                { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}33` },
              ]}
              variant="plain"
            >
              <AppText variant="body" style={[styles.topActionText, { color: theme.accent }]}>
                {t('common.back')}
              </AppText>
            </Button>
          ) : (
            <View style={styles.topChipPlaceholder} />
          )}

          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { backgroundColor: theme.accent }, progressStyle]}
            />
          </View>

          {onSkip ? (
            <Button
              onPress={onSkip}
              hitSlop={8}
              disabled={busy}
              style={[
                styles.topChip,
                { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}33` },
              ]}
              variant="plain"
            >
              <AppText variant="body" style={[styles.topActionText, { color: theme.accent }]}>
                {skipLabel ?? t('common.next')}
              </AppText>
            </Button>
          ) : (
            <View style={styles.topChipPlaceholder} />
          )}
        </View>

        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(400)}>
            <AppText variant="caption" style={[styles.eyebrow, { color: theme.accent }]}>
              {t('common.stepOf', { current: step + 1, total: TOTAL_PHASE_A_STEPS })}
            </AppText>
          </Animated.View>

          {hero ? (
            <Animated.View entering={FadeInDown.delay(40).duration(520).springify().damping(18)}>
              {hero}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).duration(520).springify().damping(18)}>
            <AppText variant="screenTitle" style={[styles.title, { color: theme.title }]}>
              {title}
            </AppText>
            <AppText variant="subtitle" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(140).duration(540).springify().damping(18)}
            style={styles.content}
          >
            {children}
          </Animated.View>
        </Animated.ScrollView>

        {footer ? (
          <Animated.View
            entering={FadeInUp.delay(180).duration(480).springify().damping(20)}
            style={styles.footer}
          >
            {footer}
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

export function OnboardingPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  accent,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accent?: string;
}) {
  const color = accent ?? palette.primary;
  return (
    <Button
      style={[styles.primaryCta, { backgroundColor: color }, shadow.soft]}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      variant="plain"
    >
      <AppText variant="button" style={styles.primaryCtaLabel}>
        {label}
      </AppText>
    </Button>
  );
}

export function OnboardingSecondaryButton({
  label,
  onPress,
  disabled,
  loading,
  accent,
  soft,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accent?: string;
  soft?: string;
}) {
  const color = accent ?? palette.primary;
  const bg = soft ?? palette.primaryLight;
  return (
    <Button
      style={[styles.secondaryCta, { borderColor: color, backgroundColor: bg }]}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      variant="plain"
    >
      <AppText variant="button" style={{ color }}>
        {label}
      </AppText>
    </Button>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  meshBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -70,
    opacity: 0.55,
  },
  meshBlobSm: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: 120,
    left: -60,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  topChip: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  topChipPlaceholder: {
    minWidth: 58,
  },
  topActionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  title: {
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  primaryCta: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
