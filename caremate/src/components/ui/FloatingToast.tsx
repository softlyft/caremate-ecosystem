import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

type FloatingToastProps = {
  title: string;
  message: string;
  icon?: ReactNode;
  accent?: string;
  soft?: string;
  durationMs?: number;
  onHide: () => void;
};

/**
 * Lightweight animated toast for soft validation / hints.
 * Mount/unmount from the parent to trigger enter/exit animation.
 */
export function FloatingToast({
  title,
  message,
  icon,
  accent = palette.brandPurple,
  soft = palette.purpleLight,
  durationMs = 2800,
  onHide,
}: FloatingToastProps) {
  useEffect(() => {
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onHide]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      entering={FadeInDown.springify().damping(16).stiffness(180)}
      exiting={FadeOutUp.duration(220)}
      style={[styles.toast, shadow.card, { backgroundColor: soft, borderColor: `${accent}33` }]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: '#FFFFFF', borderColor: `${accent}33` }]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.copy}>
        <AppText variant="cardTitle" style={[styles.title, { color: accent }]}>
          {title}
        </AppText>
        <AppText variant="caption" style={styles.message}>
          {message}
        </AppText>
      </View>
    </Animated.View>
  );
}

/** Gentle horizontal shake — useful when a form action fails validation. */
export function useShakeNudge() {
  const offset = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const shake = () => {
    // Reanimated shared values are mutable by design.
    // eslint-disable-next-line react-hooks/immutability
    offset.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(0, { duration: 50 }),
    );
  };

  return { style, shake };
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  message: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
});
