import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { reconcilePushRegistrationWithOsPermission } from '@/domains/notifications/push';
import { resyncDailyTipScheduledNotifications } from '@/domains/tips/scheduled-notifications';
import { useAuthStore } from '@/features/auth/store';

/**
 * Keep the in-app Push toggle aligned with OS notification permission for
 * signed-in users. Always refreshes local daily tip schedules (guests included).
 */
export function PushPermissionReconciler() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (isAuthenticated) {
      void reconcilePushRegistrationWithOsPermission();
    }
    void resyncDailyTipScheduledNotifications();

    const onChange = (next: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (wasBackground && next === 'active') {
        if (isAuthenticated) {
          void reconcilePushRegistrationWithOsPermission();
        }
        void resyncDailyTipScheduledNotifications();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isInitialized, isAuthenticated]);

  return null;
}
