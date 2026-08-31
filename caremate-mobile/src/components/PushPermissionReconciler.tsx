import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { reconcilePushRegistrationWithOsPermission } from '@/domains/notifications/push';
import { useAuthStore } from '@/features/auth/store';

/**
 * Keep the in-app Push toggle aligned with OS notification permission:
 * run on sign-in mount and when returning to the foreground.
 */
export function PushPermissionReconciler() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) {
      return;
    }

    void reconcilePushRegistrationWithOsPermission();

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
