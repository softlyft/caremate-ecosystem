import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';
import { config } from '@/constants/env';

/** How often to re-validate while the app stays in the foreground. */
const FOREGROUND_CHECK_INTERVAL_MS = 45_000;

function isFatalAuthError(error: { message?: string; status?: number } | null): boolean {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('refresh token') ||
    message.includes('invalid jwt') ||
    (message.includes('session') && message.includes('not found')) ||
    message.includes('banned') ||
    message.includes('user not found') ||
    message.includes('does not exist')
  );
}

async function endLocalSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Still drop UI to guest.
  }
  await useAuthStore.getState().handleRemoteSessionEnd();
}

/**
 * Enforce a live Auth session for:
 * - Admin disable/ban (sessions + refresh tokens revoked)
 * - Single-device login (`signOut({ scope: 'others' })` on the new device)
 *
 * Access JWTs stay valid until expiry; refreshing fails as soon as the refresh
 * token is revoked — so we refresh on resume / interval instead of waiting.
 */
export function AuthSessionGuard() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useAuthStore((state) => state.isGuest);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!config.isSupabaseConfigured || !isInitialized || !isAuthenticated || isGuest) {
      return;
    }

    const enforceActiveSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          await endLocalSession();
          return;
        }

        // Fails immediately when another device signed in (others revoked) or admin banned.
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          if (isFatalAuthError(refreshError)) {
            await endLocalSession();
          }
          return;
        }

        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          if (!userError || isFatalAuthError(userError)) {
            await endLocalSession();
          }
        }
      } catch {
        // Offline / transient — keep local session; next successful check will enforce.
      }
    };

    void enforceActiveSession();

    const interval = setInterval(() => {
      if (appState.current === 'active') {
        void enforceActiveSession();
      }
    }, FOREGROUND_CHECK_INTERVAL_MS);

    const onChange = (next: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (wasBackground && next === 'active') {
        void enforceActiveSession();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isInitialized, isAuthenticated, isGuest]);

  return null;
}
