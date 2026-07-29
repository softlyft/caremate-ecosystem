import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import {
  BookOpen,
  Home,
  LayoutGrid,
  MapPin,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { palette } from '@/theme';
import { fontFamily } from '@/theme/typography';

const TAB_ROUTE_KEYS: Record<string, string> = {
  index: 'tabs.home',
  articles: 'tabs.learn',
  providers: 'tabs.nearby',
  apps: 'tabs.apps',
  profile: 'tabs.me',
};

const TAB_ICONS: Record<string, LucideIcon> = {
  index: Home,
  articles: BookOpen,
  providers: MapPin,
  apps: LayoutGrid,
  profile: UserRound,
};

type TabItemProps = {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({ routeName, isFocused, onPress, onLongPress }: TabItemProps) {
  const { t } = useTranslation();
  const Icon = TAB_ICONS[routeName] ?? Home;
  const labelKey = TAB_ROUTE_KEYS[routeName];
  const label = labelKey ? t(labelKey) : routeName;

  const activeColor = palette.primaryDark;
  const idleColor = palette.textSecondary;
  const iconColor = isFocused ? activeColor : idleColor;
  const labelColor = isFocused ? activeColor : idleColor;

  return (
    <Button
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      scale={0.92} variant="plain">
      <View style={styles.iconSlot}>
        <Icon color={iconColor} size={22} strokeWidth={isFocused ? 2.6 : 2} />
      </View>
      <AppText
        variant="navLabel"
        style={[
          styles.label,
          {
            color: labelColor,
            fontFamily: isFocused ? fontFamily.bold : fontFamily.medium,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
      >
        {label}
      </AppText>
    </Button>
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
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
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
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
