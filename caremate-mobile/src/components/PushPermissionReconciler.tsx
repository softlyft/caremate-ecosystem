import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { reconcilePushRegistrationWithOsPermission } from '@/domains/notifications/push';
import { useAuthStore } from '@/features/auth/store';

/**
 * When returning to the foreground, drop the Expo push token if the OS revoked
 * notification permission (or re-sync if it was granted again).
 */
export function PushPermissionReconciler() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) {
      return;
    }

    const onChange = (next: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (wasBackground && next === 'active') {
        void reconcilePushRegistrationWithOsPermission();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isInitialized, isAuthenticated]);

  return null;
}
