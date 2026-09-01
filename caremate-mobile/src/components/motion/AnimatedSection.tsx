import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTabMotionEnabled } from '@/components/motion/TabMotionContext';

type AnimatedSectionProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** Set false to skip enter animation even outside tab navigator. */
  animated?: boolean;
};

const BASE_DELAY = 60;
const STAGGER = 70;

export function AnimatedSection({
  children,
  index = 0,
  style,
  animated = true,
}: AnimatedSectionProps) {
  const tabMotionEnabled = useTabMotionEnabled();
  const shouldAnimate = animated && tabMotionEnabled;

  if (!shouldAnimate) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(BASE_DELAY + index * STAGGER)
        .duration(520)
        .springify()
        .damping(22)
        .stiffness(180)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
