import { usePathname, useSegments } from 'expo-router';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { PropsWithChildren, useEffect } from 'react';

import { config } from '@/constants/env';
import { useAuthStore } from '@/features/auth/store';
import {
  bindPostHogClient,
  identifyAnalyticsUser,
  isAnalyticsEnabled,
  resetAnalytics,
  trackScreen,
} from '@/lib/monitoring/analytics';
import { setSentryUser } from '@/lib/monitoring/sentry';

function MonitoringIdentityBridge({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    if (!user || isGuest) {
      setSentryUser(null);
      resetAnalytics();
      return;
    }
    setSentryUser({ id: user.id, email: user.email });
    identifyAnalyticsUser({ id: user.id, email: user.email, isGuest: false });
  }, [isInitialized, isGuest, user]);

  return children;
}

function PostHogClientBinder({ children }: PropsWithChildren) {
  const posthog = usePostHog();

  useEffect(() => {
    bindPostHogClient(posthog ?? null);
    return () => {
      bindPostHogClient(null);
    };
  }, [posthog]);

  return children;
}

function ScreenTracker({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    if (!pathname) {
      return;
    }
    trackScreen(pathname, { segments: segments.join('/') });
  }, [pathname, segments]);

  return children;
}

/**
 * PostHog + identity/screen bridges. Renders children unchanged when analytics is off.
 * When disabled, skips PostHogProvider so hooks that require it are never called.
 */
export function MonitoringProvider({ children }: PropsWithChildren) {
  const body = (
    <MonitoringIdentityBridge>
      <ScreenTracker>{children}</ScreenTracker>
    </MonitoringIdentityBridge>
  );

  if (!isAnalyticsEnabled()) {
    return body;
  }

  return (
    <PostHogProvider
      apiKey={config.posthogApiKey}
      options={{
        host: config.posthogHost,
        enableSessionReplay: false,
        captureAppLifecycleEvents: true,
      }}
      autocapture={false}
    >
      <PostHogClientBinder>{body}</PostHogClientBinder>
    </PostHogProvider>
  );
}
