import { router } from 'expo-router';
import { Compass, PartyPopper, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { completePhaseA } from '@/domains/onboarding';
import {
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
  OnboardingShell,
} from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[5];

export default function OnboardingNextScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const burst = useSharedValue(0.85);

  useEffect(() => {
    burst.value = withDelay(120, withSpring(1, { damping: 12, stiffness: 140 }));
  }, [burst]);

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burst.value }],
  }));

  async function finishAndGo(href: '/(app)/(tabs)' | '/(auth)/register' | '/(auth)/login') {
    setBusy(true);
    try {
      await completePhaseA();
      router.replace(href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={5}
      title={t('onboarding.next.title')}
      subtitle={t('onboarding.next.subtitle')}
      showBack
      hero={
        <Animated.View style={[styles.heroShell, shadow.card, burstStyle]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: theme.soft },
              { offset: '55%', color: '#D1FAE5' },
              { offset: '100%', color: theme.softEnd },
            ]}
            angle={140}
            style={styles.hero}
          >
            <View style={[styles.blob, { backgroundColor: theme.blob }]} />
            <View style={styles.heroIcon}>
              <PartyPopper color={theme.accent} size={30} strokeWidth={2.1} />
            </View>
          </LinearGradientFill>
        </Animated.View>
      }
      footer={
        <>
          <OnboardingPrimaryButton
            label={busy ? t('onboarding.next.saving') : t('onboarding.next.continueExploring')}
            accent={theme.accent}
            disabled={busy}
            onPress={() => void finishAndGo('/(app)/(tabs)')}
          />
          <OnboardingSecondaryButton
            label={t('onboarding.next.createAccount')}
            accent={theme.accent}
            soft={theme.soft}
            disabled={busy}
            onPress={() => void finishAndGo('/(auth)/register')}
          />
          <OnboardingSecondaryButton
            label={t('onboarding.next.haveAccount')}
            accent={theme.title}
            soft="#FFFFFF"
            disabled={busy}
            onPress={() => void finishAndGo('/(auth)/login')}
          />
        </>
      }
    >
      <Animated.View entering={FadeInDown.delay(140).duration(480)} style={styles.cards}>
        <View
          style={[
            styles.infoCard,
            { borderColor: `${theme.accent}44`, backgroundColor: theme.soft },
          ]}
        >
          <View style={styles.infoIcon}>
            <Compass color={theme.accent} size={18} />
          </View>
          <View style={styles.infoCopy}>
            <AppText variant="cardTitle" style={{ color: theme.title }}>
              {t('onboarding.next.browseTitle')}
            </AppText>
            <AppText variant="caption" style={styles.infoHint}>
              {t('onboarding.next.browseHint')}
            </AppText>
          </View>
        </View>

        <View style={[styles.infoCard, shadow.soft]}>
          <View style={[styles.infoIcon, { backgroundColor: palette.purpleLight }]}>
            <UserPlus color={palette.brandPurple} size={18} />
          </View>
          <View style={styles.infoCopy}>
            <AppText variant="cardTitle" style={{ color: palette.brandPurpleDark }}>
              {t('onboarding.next.syncTitle')}
            </AppText>
            <AppText variant="caption" style={styles.infoHint}>
              {t('onboarding.next.syncHint')}
            </AppText>
          </View>
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
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.5,
    top: -30,
    right: -10,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.accent}33`,
  },
  cards: {
    gap: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: theme.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoHint: {
    color: palette.textSecondary,
    fontFamily: fontFamily.regular,
  },
});
