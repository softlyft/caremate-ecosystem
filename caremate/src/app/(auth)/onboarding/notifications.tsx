import { router } from 'expo-router';
import { Bell, BellRing } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Switch } from '@/components/ui/switch';
import { useOnboardingDraftStore } from '@/domains/onboarding';
import { OnboardingPrimaryButton, OnboardingShell } from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[4];

export default function OnboardingNotificationsScreen() {
  const notificationsEnabled = useOnboardingDraftStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useOnboardingDraftStore((s) => s.setNotificationsEnabled);
  const swing = useSharedValue(0);

  useEffect(() => {
    swing.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 180 }),
        withTiming(8, { duration: 180 }),
        withTiming(-5, { duration: 140 }),
        withTiming(0, { duration: 140 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [swing]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value}deg` }],
  }));

  function handleSkip() {
    setNotificationsEnabled(true);
    router.push('/(auth)/onboarding/next');
  }

  return (
    <OnboardingShell
      step={4}
      title="Stay in the loop"
      subtitle="Save your preference now. Push delivery turns on when CareMate notifications are fully wired."
      onSkip={handleSkip}
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
            <Animated.View style={bellStyle}>
              <View style={[styles.heroIcon, { borderColor: `${theme.accent}33` }]}>
                {notificationsEnabled ? (
                  <BellRing color={theme.accent} size={28} strokeWidth={2.2} />
                ) : (
                  <Bell color={theme.accent} size={28} strokeWidth={2.2} />
                )}
              </View>
            </Animated.View>
          </LinearGradientFill>
        </View>
      }
      footer={
        <OnboardingPrimaryButton
          label="Continue"
          accent={theme.accent}
          onPress={() => router.push('/(auth)/onboarding/next')}
        />
      }
    >
      <Animated.View entering={FadeInDown.delay(120).duration(480)}>
        <View
          style={[
            styles.row,
            shadow.soft,
            notificationsEnabled
              ? { borderColor: theme.accent, backgroundColor: theme.soft }
              : null,
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: '#FFFFFF' }]}>
            <Bell color={theme.accent} size={18} />
          </View>
          <View style={styles.copy}>
            <AppText variant="body" style={[styles.title, { color: theme.title }]}>
              Health reminders
            </AppText>
            <AppText variant="caption" style={styles.subtitle}>
              Tips, checkup nudges, and important updates
            </AppText>
          </View>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
        </View>
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: spacing.xs,
  },
  hero: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    color: palette.textSecondary,
  },
});
