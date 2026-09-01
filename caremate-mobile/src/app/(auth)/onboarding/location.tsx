import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Crosshair, MapPinned, Navigation } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/form-controls';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { localizationService, useTranslation } from '@/domains/localization';
import { useOnboardingDraftStore } from '@/domains/onboarding';
import {
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
  OnboardingShell,
} from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[3];

export default function OnboardingLocationScreen() {
  const { t } = useTranslation();
  const setLocationMode = useOnboardingDraftStore((s) => s.setLocationMode);
  const skipLocation = useOnboardingDraftStore((s) => s.skipLocation);
  const countryCode = useOnboardingDraftStore((s) => s.countryCode);
  const regionState = useOnboardingDraftStore((s) => s.state);
  const [busy, setBusy] = useState(false);
  const ping = useSharedValue(0.4);

  const placeLabel = regionState.trim() || localizationService.getCountryConfig(countryCode).name;

  useEffect(() => {
    ping.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100 }), withTiming(0.35, { duration: 1100 })),
      -1,
      false,
    );
  }, [ping]);

  const pingStyle = useAnimatedStyle(() => ({
    opacity: ping.value,
    transform: [{ scale: 0.85 + ping.value * 0.35 }],
  }));

  async function enablePrecise() {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        setLocationMode('precise');
      } else {
        setLocationMode('approximate');
      }
      router.push('/(auth)/onboarding/notifications');
    } catch {
      setLocationMode('approximate');
      router.push('/(auth)/onboarding/notifications');
    } finally {
      setBusy(false);
    }
  }

  function useApproximate() {
    skipLocation();
    router.push('/(auth)/onboarding/notifications');
  }

  return (
    <OnboardingShell
      step={3}
      title={t('onboarding.location.title')}
      subtitle={t('onboarding.location.subtitle')}
      onSkip={useApproximate}
      busy={busy}
      hero={
        <View style={[styles.heroShell, shadow.card]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: theme.soft },
              { offset: '100%', color: theme.softEnd },
            ]}
            angle={135}
            style={styles.hero}
          >
            <Animated.View style={[styles.pingRing, pingStyle, { borderColor: theme.accent }]} />
            <View style={[styles.heroIcon, { borderColor: `${theme.accent}33` }]}>
              <Navigation color={theme.accent} size={28} strokeWidth={2.2} />
            </View>
          </LinearGradientFill>
        </View>
      }
      footer={
        <>
          <OnboardingPrimaryButton
            label={busy ? t('onboarding.location.checking') : t('onboarding.location.enable')}
            accent={theme.accent}
            loading={busy}
            onPress={() => void enablePrecise()}
          />
          <OnboardingSecondaryButton
            label={t('onboarding.location.approximateCta')}
            accent={theme.accent}
            soft={theme.soft}
            disabled={busy}
            onPress={useApproximate}
          />
        </>
      }
    >
      <Animated.View entering={FadeInDown.delay(120).duration(480)} style={styles.options}>
        <Button
          style={[styles.optionCard, shadow.soft]}
          disabled={busy}
          onPress={() => void enablePrecise()}
          variant="plain"
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.soft }]}>
            <Crosshair color={theme.accent} size={20} />
          </View>
          <View style={styles.optionCopy}>
            <AppText variant="cardTitle" style={{ color: theme.title }}>
              {t('onboarding.location.precise.title')}
            </AppText>
            <AppText variant="caption" style={styles.optionHint}>
              {t('onboarding.location.precise.hint')}
            </AppText>
          </View>
        </Button>

        <Button
          style={[styles.optionCard, shadow.soft]}
          disabled={busy}
          onPress={useApproximate}
          variant="plain"
        >
          <View style={[styles.optionIcon, { backgroundColor: theme.soft }]}>
            <MapPinned color={theme.accent} size={20} />
          </View>
          <View style={styles.optionCopy}>
            <AppText variant="cardTitle" style={{ color: theme.title }}>
              {t('onboarding.location.approximate.title')}
            </AppText>
            <AppText variant="caption" style={styles.optionHint}>
              {t('onboarding.location.approximate.hint', { place: placeLabel })}
            </AppText>
          </View>
        </Button>
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
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  options: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionHint: {
    color: palette.textSecondary,
    fontFamily: fontFamily.regular,
  },
});
