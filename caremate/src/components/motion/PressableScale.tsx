import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  children: ReactNode;
  scale?: number;
  style?: StyleProp<ViewStyle>;
};

export function PressableScale({
  children,
  scale = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        pressed.value = withSpring(scale, { damping: 18, stiffness: 320 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(1, { damping: 14, stiffness: 260 });
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
