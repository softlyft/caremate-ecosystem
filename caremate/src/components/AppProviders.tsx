import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Center } from '@/components/ui/center';
import { Button } from '@/components/ui/form-controls';
import { Spinner } from '@/components/ui/spinner';
import { initializeDatabase } from '@/database/client';
import { useAuthStore } from '@/features/auth/store';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { articleRepository } from '@/domains/articles/repository';
import { emergencyRepository } from '@/domains/emergency/repository';
import { providerRepository } from '@/domains/providers/repository';
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
        await Promise.all([articleRepository.seedIfEmpty(), providerRepository.seedIfEmpty()]);
        await initializeAuth();

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
                await Promise.all([
                  articleRepository.seedIfEmpty(),
                  providerRepository.seedIfEmpty(),
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
        <Spinner size="large" color="#16A34A" />
      </Center>
    );
  }

  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BootstrapGate>{children}</BootstrapGate>
    </QueryClientProvider>
  );
}
