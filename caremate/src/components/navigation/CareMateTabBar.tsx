import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { BookOpen, Home, LayoutGrid, MapPin, UserRound, type LucideIcon } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { palette, radius } from '@/theme';

const TAB_META: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
  }
> = {
  index: { label: 'Home', icon: Home },
  articles: { label: 'Learn', icon: BookOpen },
  providers: { label: 'Nearby', icon: MapPin },
  apps: { label: 'Apps', icon: LayoutGrid },
  profile: { label: 'Me', icon: UserRound },
};

type TabItemProps = {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({ routeName, isFocused, onPress, onLongPress }: TabItemProps) {
  const meta = TAB_META[routeName];
  const Icon = meta?.icon ?? Home;
  const label = meta?.label ?? routeName;
  const indicator = useSharedValue(isFocused ? 1 : 0);

  indicator.value = withSpring(isFocused ? 1 : 0, {
    damping: 18,
    stiffness: 240,
  });

  const pillStyle = useAnimatedStyle(() => ({
    opacity: indicator.value,
    transform: [{ scale: 0.85 + indicator.value * 0.15 }],
  }));

  const iconColor = isFocused ? palette.primaryDark : palette.textSecondary;
  const labelColor = isFocused ? palette.primaryDark : palette.textSecondary;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      scale={0.92}
    >
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.activePill, pillStyle]} />
        <Icon color={iconColor} size={22} strokeWidth={isFocused ? 2.5 : 2} />
      </View>
      <AppText
        variant="navLabel"
        style={[styles.label, { color: labelColor, fontWeight: isFocused ? '600' : '500' }]}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

/** Extra space between the bar and the device bottom edge (below safe area). */
const TAB_BAR_BOTTOM_MARGIN = 10;

export function CareMateTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const bottomPad = Math.max(insets.bottom, 10) + TAB_BAR_BOTTOM_MARGIN;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Approximate footer clearance for tab scenes (bar + margins + safe area cushion). */
export const TAB_BAR_SCENE_INSET = 96 + TAB_BAR_BOTTOM_MARGIN;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: {
        elevation: 14,
      },
      default: {},
    }),
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 64,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  iconSlot: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
