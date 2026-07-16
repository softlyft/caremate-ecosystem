import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isNull } from 'drizzle-orm';

import { AppText } from '@/components/ui/AppText';
import { Center } from '@/components/ui/center';
import { Button } from '@/components/ui/form-controls';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { getDatabase, initializeDatabase } from '@/database/client';
import { profiles } from '@/database/schema';
import { I18nProvider } from '@/domains/localization';
import { getDeviceDefaults } from '@/domains/onboarding';
import { useSettingsStore } from '@/domains/profile/store';
import { useAuthStore } from '@/features/auth/store';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { articleRepository } from '@/domains/articles/repository';
import { emergencyRepository } from '@/domains/emergency/repository';
import { providerRepository } from '@/domains/providers/repository';
import { healthTipRepository } from '@/domains/tips/repository';
import { authService } from '@/services/auth-service';
import { registerDailyBackgroundSync } from '@/sync/background-daily-sync';
import { syncEngine } from '@/sync/engine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

async function migrateOnboardingFlagIfUpgrading() {
  const alreadyComplete = await authService.isOnboardingComplete();
  if (alreadyComplete) {
    return;
  }
  // Existing installs (pre-onboarding) often already have a profile row. Skip the wizard for them.
  try {
    const db = getDatabase();
    const [row] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(isNull(profiles.deletedAt))
      .limit(1);
    if (row) {
      await authService.setOnboardingComplete(true);
    }
  } catch {
    // Best-effort; first-time installs continue into onboarding.
  }
}

async function runBackgroundStartupTasks() {
  try {
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const profile = await emergencyRepository.findByUserId(userId);
      await syncEmergencyLockSurface(profile);
    }
  } catch {
    // Widget sync is best-effort and must not block the UI.
  }

  try {
    await syncEngine.start();
    await registerDailyBackgroundSync();
  } catch {
    // Background sync failures should not affect local-first startup.
  }
}

function BootstrapGate({ children }: PropsWithChildren) {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const [dbReady, setDbReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        // Critical path: local SQLite + session only. Network sync stays in the background.
        await initializeDatabase();
        await providerRepository.purgeBundledProviders();
        await migrateOnboardingFlagIfUpgrading();
        // Catalogs: portal → Supabase (guests included via anon RLS).
        await Promise.all([
          articleRepository.pullFromRemote(),
          healthTipRepository.pullFromRemote(),
        ]);
        await initializeAuth();

        try {
          const defaults = await getDeviceDefaults();
          useSettingsStore.getState().setNotificationsEnabled(defaults.notificationsEnabled);
        } catch {
          // Device defaults are optional on cold start.
        }

        if (mounted) {
          setDbReady(true);
          setBootstrapError(null);
        }

        void runBackgroundStartupTasks();
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error ? error.message : 'Failed to initialize local database';
          setBootstrapError(message);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      void syncEngine.stop();
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (!dbReady || !isAuthenticated || !userId) {
      return;
    }
    // Fresh sign-in / session restore: migrate local mini-apps and sync immediately.
    syncEngine.requestSync({ reason: 'auth', immediate: true });
  }, [dbReady, isAuthenticated, userId]);

  if (bootstrapError) {
    return (
      <Center className="flex-1 p-6 gap-3 bg-background">
        <AppText variant="cardTitle" style={{ textAlign: 'center', color: '#EF4444' }}>
          Database startup failed
        </AppText>
        <AppText variant="quickActionSubtitle" style={{ textAlign: 'center' }}>
          {bootstrapError}
        </AppText>
        {Platform.OS === 'web' ? (
          <AppText variant="quickActionSubtitle" style={{ textAlign: 'center' }}>
            Web SQLite is experimental. Use iOS or Android for the full offline experience, then
            restart with `npx expo start --clear`.
          </AppText>
        ) : null}
        <Button
          label="Retry"
          onPress={() => {
            setBootstrapError(null);
            setDbReady(false);
            initializeDatabase()
              .then(async () => {
                await providerRepository.purgeBundledProviders();
                await Promise.all([
                  articleRepository.pullFromRemote(),
                  healthTipRepository.pullFromRemote(),
                ]);
                await initializeAuth();
                setDbReady(true);
                void runBackgroundStartupTasks();
              })
              .catch((error: unknown) => {
                const message =
                  error instanceof Error ? error.message : 'Failed to initialize local database';
                setBootstrapError(message);
              });
          }}
        />
      </Center>
    );
  }

  if (!dbReady || !isInitialized) {
    return (
      <Center className="flex-1 bg-background">
        <BrandLoader size="lg" />
      </Center>
    );
  }

  return children;
}

function LocalizedApp({ children }: PropsWithChildren) {
  return <I18nProvider>{children}</I18nProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BootstrapGate>
        <LocalizedApp>{children}</LocalizedApp>
      </BootstrapGate>
    </QueryClientProvider>
  );
}
