import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BookOpen, MapPinned, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { images } from '@/constants/assets';
import { OnboardingPrimaryButton, OnboardingShell } from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[0];

const PREVIEWS = [
  {
    icon: Sparkles,
    label: 'Your priorities',
    color: palette.brandPurple,
    soft: palette.purpleLight,
  },
  { icon: BookOpen, label: 'Local health news', color: '#0284C7', soft: '#E0F2FE' },
  { icon: MapPinned, label: 'Nearby care', color: palette.brandBlue, soft: palette.brandBlueLight },
] as const;

export default function OnboardingWelcomeScreen() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1,
      false,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <OnboardingShell
      step={0}
      title="Care that works offline"
      subtitle="A short setup so Nearby, news, and emergency tools feel right from day one."
      showBack={false}
      hero={
        <View style={[styles.heroShell, shadow.card]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: theme.soft },
              { offset: '100%', color: theme.softEnd },
            ]}
            angle={130}
            style={styles.hero}
          >
            <View style={[styles.heroBlob, { backgroundColor: theme.blob }]} />
            <Animated.View style={[styles.logoRing, pulseStyle]}>
              <View style={styles.logoInner}>
                <Image source={images.logo} style={styles.logo} contentFit="contain" />
              </View>
            </Animated.View>
          </LinearGradientFill>
        </View>
      }
      footer={
        <OnboardingPrimaryButton
          label="Let's go"
          accent={theme.accent}
          onPress={() => router.push('/(auth)/onboarding/priorities')}
        />
      }
    >
      <View style={styles.previewList}>
        {PREVIEWS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Animated.View
              key={item.label}
              entering={FadeInDown.delay(180 + index * 90)
                .duration(480)
                .springify()
                .damping(18)}
            >
              <View
                style={[
                  styles.previewRow,
                  { backgroundColor: item.soft, borderColor: `${item.color}33` },
                ]}
              >
                <View style={[styles.previewIcon, { backgroundColor: '#FFFFFF' }]}>
                  <Icon color={item.color} size={18} strokeWidth={2.3} />
                </View>
                <AppText variant="body" style={[styles.previewLabel, { color: item.color }]}>
                  {item.label}
                </AppText>
              </View>
            </Animated.View>
          );
        })}
      </View>
      <AppText variant="caption" style={styles.foot}>
        Skip anytime — finish later from Profile.
      </AppText>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: spacing.sm,
  },
  hero: {
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  heroBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.45,
    top: -40,
    right: -20,
  },
  logoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: `${theme.accent}33`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 56,
    height: 28,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontFamily: fontFamily.semiBold,
  },
  foot: {
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
