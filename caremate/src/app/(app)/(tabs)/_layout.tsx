import { Tabs } from 'expo-router';

import { CareMateTabBar, TAB_BAR_SCENE_INSET } from '@/components/navigation/CareMateTabBar';
import { useTranslation } from '@/domains/localization';

export default function TabsLayout() {
  const { t } = useTranslation();

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
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="articles" options={{ title: t('tabs.learn') }} />
      <Tabs.Screen name="providers" options={{ title: t('tabs.nearby') }} />
      <Tabs.Screen name="apps" options={{ title: t('tabs.apps') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}
