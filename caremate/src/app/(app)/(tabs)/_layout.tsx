import { Tabs } from 'expo-router';
import { BookOpen, Home, LayoutGrid, MapPin, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, shadow, typography } from '@/theme';

const TAB_BAR_CONTENT_HEIGHT = 62;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: typography.navLabel,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.divider,
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          ...shadow.soft,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="articles"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="providers"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
