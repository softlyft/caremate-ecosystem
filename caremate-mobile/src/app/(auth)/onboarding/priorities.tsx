import { router } from 'expo-router';
import { BookOpen, MapPinned, Sparkles, ShieldPlus, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { FloatingToast, useShakeNudge } from '@/components/ui/FloatingToast';
import { ONBOARDING_PRIORITY_IDS, useOnboardingDraftStore } from '@/domains/onboarding';
import type { OnboardingPriorityId } from '@/domains/onboarding';
import { OnboardingPrimaryButton, OnboardingShell } from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES, PRIORITY_VISUALS } from '@/domains/onboarding/themes';
import { useTranslation } from '@/domains/localization';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[1];

const ICONS = {
  emergency: ShieldPlus,
  nearby: MapPinned,
  family: Users,
  learn: BookOpen,
} as const;

export default function OnboardingPrioritiesScreen() {
  const { t } = useTranslation();
  const priorities = useOnboardingDraftStore((s) => s.priorities);
  const togglePriority = useOnboardingDraftStore((s) => s.togglePriority);
  const [showHint, setShowHint] = useState(false);
  const [hintKey, setHintKey] = useState(0);
  const { style: shakeStyle, shake } = useShakeNudge();

  const hideHint = useCallback(() => setShowHint(false), []);

  const continueNext = () => {
    if (priorities.length === 0) {
      setShowHint(true);
      setHintKey((key) => key + 1);
      shake();
      return;
    }
    setShowHint(false);
    router.push('/(auth)/onboarding/location');
  };

  return (
    <OnboardingShell
      step={2}
      title={t('onboarding.priorities.title')}
      subtitle={t('onboarding.priorities.subtitle')}
      onSkip={() => router.push('/(auth)/onboarding/location')}
      footer={
        <>
          {showHint ? (
            <FloatingToast
              key={hintKey}
              title={t('onboarding.priorities.minSelectTitle')}
              message={t('onboarding.priorities.minSelectMessage')}
              accent={theme.accent}
              soft={theme.soft}
              icon={<Sparkles color={theme.accent} size={18} strokeWidth={2.3} />}
              onHide={hideHint}
            />
          ) : null}
          <OnboardingPrimaryButton
            label={
              priorities.length
                ? t('onboarding.priorities.continueSelected', { count: priorities.length })
                : t('common.continue')
            }
            accent={theme.accent}
            onPress={continueNext}
          />
        </>
      }
    >
      <Animated.View style={[styles.list, shakeStyle]}>
        {ONBOARDING_PRIORITY_IDS.map((item, index) => {
          const id = item as OnboardingPriorityId;
          const selected = priorities.includes(id);
          const visual = PRIORITY_VISUALS[id];
          const Icon = ICONS[id];
          return (
            <Animated.View
              key={id}
              entering={FadeInDown.delay(100 + index * 80)
                .duration(480)
                .springify()
                .damping(18)}
            >
              <PressableScale
                style={[
                  styles.card,
                  shadow.soft,
                  selected
                    ? {
                        borderColor: visual.accent,
                        backgroundColor: visual.soft,
                      }
                    : null,
                ]}
                onPress={() => {
                  setShowHint(false);
                  togglePriority(id);
                }}
                scale={0.97}
              >
                <LinearGradientFill
                  colors={[
                    { offset: '0%', color: selected ? visual.soft : '#FFFFFF' },
                    { offset: '100%', color: selected ? visual.softEnd : palette.surface },
                  ]}
                  angle={125}
                  style={styles.cardInner}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: selected ? '#FFFFFF' : visual.soft,
                        borderColor: `${visual.accent}33`,
                      },
                    ]}
                  >
                    <Icon color={visual.accent} size={22} strokeWidth={2.3} />
                  </View>
                  <View style={styles.copy}>
                    <AppText
                      variant="cardTitle"
                      style={[styles.label, selected ? { color: visual.accent } : null]}
                    >
                      {t(`onboarding.priorities.${id}.label`)}
                    </AppText>
                    <AppText variant="caption" style={styles.description}>
                      {t(`onboarding.priorities.${id}.description`)}
                    </AppText>
                  </View>
                  {selected ? (
                    <Animated.View
                      entering={ZoomIn.duration(220)}
                      style={[styles.check, { backgroundColor: visual.accent }]}
                    >
                      <AppText variant="caption" style={styles.checkLabel}>
                        ✓
                      </AppText>
                    </Animated.View>
                  ) : (
                    <View style={styles.checkIdle} />
                  )}
                </LinearGradientFill>
              </PressableScale>
            </Animated.View>
          );
        })}
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
    backgroundColor: palette.background,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: palette.text,
  },
  description: {
    color: palette.textSecondary,
    fontFamily: fontFamily.regular,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
  checkIdle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.divider,
  },
});
