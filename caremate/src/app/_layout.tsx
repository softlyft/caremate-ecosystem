import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import '../../global.css';

import { AppProviders } from '@/components/AppProviders';
import { AuthDeepLinkHandler } from '@/components/AuthDeepLinkHandler';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAuthStore } from '@/features/auth/store';
import { useAppFonts } from '@/hooks/use-app-fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded } = useAppFonts();
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <AppProviders>
        <AuthDeepLinkHandler />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#111827',
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="emergency-lock"
            options={{ headerShown: false, title: 'Emergency' }}
          />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen
            name="auth/reset-password"
            options={{ headerShown: true, title: 'New password', presentation: 'card' }}
          />
        </Stack>
      </AppProviders>
    </GluestackUIProvider>
  );
}
