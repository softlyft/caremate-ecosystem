import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type AnimatedSectionProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

const BASE_DELAY = 60;
const STAGGER = 70;

export function AnimatedSection({ children, index = 0, style }: AnimatedSectionProps) {
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
