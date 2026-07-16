import { router } from 'expo-router';
import { BookOpen, MapPinned, ShieldPlus, Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { ONBOARDING_PRIORITIES, useOnboardingDraftStore } from '@/domains/onboarding';
import type { OnboardingPriorityId } from '@/domains/onboarding';
import {
  OnboardingPrimaryButton,
  OnboardingShell,
} from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES, PRIORITY_VISUALS } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[1];

const ICONS = {
  emergency: ShieldPlus,
  nearby: MapPinned,
  family: Users,
  learn: BookOpen,
} as const;

export default function OnboardingPrioritiesScreen() {
  const priorities = useOnboardingDraftStore((s) => s.priorities);
  const togglePriority = useOnboardingDraftStore((s) => s.togglePriority);

  return (
    <OnboardingShell
      step={1}
      title="What matters most?"
      subtitle="Tap what you care about — we'll tailor the next optional steps."
      onSkip={() => router.push('/(auth)/onboarding/region')}
      footer={
        <OnboardingPrimaryButton
          label={priorities.length ? `Continue · ${priorities.length} selected` : 'Continue'}
          accent={theme.accent}
          onPress={() => router.push('/(auth)/onboarding/region')}
        />
      }
    >
      <View style={styles.list}>
        {ONBOARDING_PRIORITIES.map((item, index) => {
          const selected = priorities.includes(item.id);
          const visual = PRIORITY_VISUALS[item.id as OnboardingPriorityId];
          const Icon = ICONS[item.id as OnboardingPriorityId];
          return (
            <Animated.View
              key={item.id}
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
                onPress={() => togglePriority(item.id)}
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
                      {item.label}
                    </AppText>
                    <AppText variant="caption" style={styles.description}>
                      {item.description}
                    </AppText>
                  </View>
                  {selected ? (
                    <Animated.View entering={ZoomIn.duration(220)} style={[styles.check, { backgroundColor: visual.accent }]}>
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
      </View>
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
