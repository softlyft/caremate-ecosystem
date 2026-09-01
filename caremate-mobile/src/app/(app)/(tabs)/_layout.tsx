import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { TabMotionProvider } from '@/components/motion/TabMotionContext';
import { CareMateTabBar, TAB_BAR_SCENE_INSET } from '@/components/navigation/CareMateTabBar';
import { useTranslation } from '@/domains/localization';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <TabMotionProvider enabled={false}>
      <Tabs
        tabBar={(props) => <CareMateTabBar {...props} />}
        detachInactiveScreens={Platform.OS === 'ios'}
        screenOptions={{
          headerShown: false,
          freezeOnBlur: false,
          lazy: true,
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
    </TabMotionProvider>
  );
}
