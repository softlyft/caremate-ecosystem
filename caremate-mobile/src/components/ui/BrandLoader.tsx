import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { images } from '@/constants/assets';
import { palette, radius } from '@/theme';

type BrandLoaderSize = 'sm' | 'md' | 'lg';

type BrandLoaderProps = {
  size?: BrandLoaderSize;
  label?: string;
};

const SIZE_MAP: Record<BrandLoaderSize, { icon: number; ring: number }> = {
  sm: { icon: 28, ring: 44 },
  md: { icon: 44, ring: 68 },
  lg: { icon: 64, ring: 96 },
};

export function BrandLoader({ size = 'lg' }: BrandLoaderProps) {
  const dims = SIZE_MAP[size];
  const pulse = useSharedValue(1);
  const ring = useSharedValue(0.35);
  const spin = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 1100, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
    spin.value = withDelay(
      120,
      withRepeat(withTiming(360, { duration: 4200, easing: Easing.linear }), -1, false),
    );
  }, [pulse, ring, spin]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value,
    transform: [{ rotate: `${spin.value}deg` }, { scale: 0.92 + ring.value * 0.12 }],
  }));

  return (
    <View
      style={[styles.wrap, { width: dims.ring, height: dims.ring }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: dims.ring,
            height: dims.ring,
            borderRadius: dims.ring / 2,
          },
          ringStyle,
        ]}
      />
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Image
          source={images.icon}
          style={{ width: dims.icon, height: dims.icon, borderRadius: radius.md }}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: palette.primary,
    borderTopColor: 'transparent',
    borderLeftColor: primarySoftBorder(),
    borderRightColor: 'transparent',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function primarySoftBorder() {
  return 'rgba(13, 148, 136, 0.25)';
}
