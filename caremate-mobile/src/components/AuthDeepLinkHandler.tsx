import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { handleAuthCallbackUrl, PASSWORD_RESET_PATH } from '@/lib/auth-deep-link';
import { config } from '@/constants/env';
import { authService } from '@/services/auth-service';
import { supabase } from '@/lib/supabase';

async function processAuthUrl(url: string): Promise<void> {
  if (!config.isSupabaseConfigured || !url) {
    return;
  }

  const result = await handleAuthCallbackUrl(url, {
    exchangeCodeForSession: (code) => authService.exchangeCodeForSession(code),
    setSession: (tokens) => authService.setSessionFromTokens(tokens),
  });

  if (result === 'recovery' || url.includes(PASSWORD_RESET_PATH)) {
    await useAuthStore.getState().markPasswordRecovery();
    router.replace('/auth/reset-password');
  } else if (result === 'session') {
    await useAuthStore.getState().syncSessionFromSupabase();
  }
}

/**
 * Handles password-reset (and other auth) deep links + PASSWORD_RECOVERY events.
 */
export function AuthDeepLinkHandler() {
  const handledInitial = useRef(false);

  useEffect(() => {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        void useAuthStore.getState().markPasswordRecovery();
        router.replace('/auth/reset-password');
        return;
      }
      if (event === 'SIGNED_OUT') {
        // Another device signed in (single-session) or local sign-out completed.
        void useAuthStore.getState().handleRemoteSessionEnd();
      }
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      void processAuthUrl(url).catch(() => {
        // Ignore malformed deep links; user can request a new email.
      });
    });

    if (!handledInitial.current) {
      handledInitial.current = true;
      void Linking.getInitialURL().then((url) => {
        if (url) {
          return processAuthUrl(url);
        }
      });
    }

    return () => {
      subscription.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  return null;
}
