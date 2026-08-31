import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import '../../global.css';

import { AppProviders } from '@/components/AppProviders';
import { AuthDeepLinkHandler } from '@/components/AuthDeepLinkHandler';
import { AuthSessionGuard } from '@/components/AuthSessionGuard';
import { ArticleShareDeepLinkHandler } from '@/components/ArticleShareDeepLinkHandler';
import { BillingDeepLinkHandler } from '@/components/BillingDeepLinkHandler';
import { EmergencyShareDeepLinkHandler } from '@/components/EmergencyShareDeepLinkHandler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MessagePushDeepLinkHandler } from '@/components/MessagePushDeepLinkHandler';
import { PushPermissionReconciler } from '@/components/PushPermissionReconciler';
import { AppDialogHost } from '@/components/ui/AppDialogHost';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useTranslation } from '@/domains/localization';
import { useAuthStore } from '@/features/auth/store';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { initSentry, Sentry } from '@/lib/monitoring/sentry';

SplashScreen.preventAutoHideAsync();
initSentry();
Appearance.setColorScheme('light');

/** Must render under AppProviders → I18nProvider (do not call useTranslation in RootLayout). */
function RootNavigator() {
  const { t } = useTranslation();

  return (
    <>
      <AuthDeepLinkHandler />
      <AuthSessionGuard />
      <BillingDeepLinkHandler />
      <EmergencyShareDeepLinkHandler />
      <ArticleShareDeepLinkHandler />
      <MessagePushDeepLinkHandler />
      <PushPermissionReconciler />
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
          options={{ headerShown: false, title: t('nav.emergency') }}
        />
        <Stack.Screen
          name="emergency/share/[token]"
          options={{ headerShown: false, title: t('nav.emergencyShare') }}
        />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/reset-password"
          options={{ headerShown: true, title: t('nav.newPassword'), presentation: 'card' }}
        />
        <Stack.Screen name="billing/success" options={{ headerShown: false }} />
        <Stack.Screen name="billing/cancel" options={{ headerShown: false }} />
      </Stack>
      <AppDialogHost />
    </>
  );
}

function RootLayout() {
  const { fontsLoaded } = useAppFonts();
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    Appearance.setColorScheme('light');
  }, []);

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
      <GluestackUIProvider mode="light">
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </GluestackUIProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
