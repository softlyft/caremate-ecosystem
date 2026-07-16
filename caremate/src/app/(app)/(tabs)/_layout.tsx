import { Tabs } from 'expo-router';

import { CareMateTabBar, TAB_BAR_SCENE_INSET } from '@/components/navigation/CareMateTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CareMateTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          paddingBottom: TAB_BAR_SCENE_INSET,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="articles" options={{ title: 'Learn' }} />
      <Tabs.Screen name="providers" options={{ title: 'Nearby' }} />
      <Tabs.Screen name="apps" options={{ title: 'Apps' }} />
      <Tabs.Screen name="profile" options={{ title: 'Me' }} />
    </Tabs>
  );
}
