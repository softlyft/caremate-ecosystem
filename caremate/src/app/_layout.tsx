import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import '../../global.css';

import { AppProviders } from '@/components/AppProviders';
import { AuthDeepLinkHandler } from '@/components/AuthDeepLinkHandler';
import { BillingDeepLinkHandler } from '@/components/BillingDeepLinkHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAuthStore } from '@/features/auth/store';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { initSentry, Sentry } from '@/lib/monitoring/sentry';

SplashScreen.preventAutoHideAsync();
initSentry();

function RootLayout() {
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
    <ErrorBoundary>
      <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
        <AppProviders>
          <AuthDeepLinkHandler />
          <BillingDeepLinkHandler />
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
            <Stack.Screen name="billing/success" options={{ headerShown: false }} />
            <Stack.Screen name="billing/cancel" options={{ headerShown: false }} />
          </Stack>
        </AppProviders>
      </GluestackUIProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
