import { useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  isNavigationRestoreComplete,
  saveLastAppHref,
  toRestorableAppHref,
} from '@/domains/navigation';
import { useAuthStore } from '@/features/auth/store';

function persistHref(
  pathname: string,
  params: Record<string, string | undefined>,
  lastSaved: { current: string | null },
): void {
  if (!isNavigationRestoreComplete()) {
    return;
  }
  const href = toRestorableAppHref(pathname, params);
  if (!href || href === lastSaved.current) {
    return;
  }
  lastSaved.current = href;
  void saveLastAppHref(href);
}

/**
 * Persists the current in-app route so cold starts after process death
 * (e.g. Android notification permission revoke) can restore the same screen.
 */
export function NavigationPersistence() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const passwordRecoveryPending = useAuthStore((state) => state.passwordRecoveryPending);
  const lastSaved = useRef<string | null>(null);
  const category = typeof params.category === 'string' ? params.category : undefined;
  const q = typeof params.q === 'string' ? params.q : undefined;
  const stableParams = useMemo(() => ({ category, q }), [category, q]);
  const pathnameRef = useRef(pathname);
  const paramsRef = useRef(stableParams);

  useEffect(() => {
    pathnameRef.current = pathname;
    paramsRef.current = stableParams;
  }, [pathname, stableParams]);

  useEffect(() => {
    if (!isInitialized || passwordRecoveryPending || !pathname) {
      return;
    }
    persistHref(pathname, stableParams, lastSaved);
  }, [isInitialized, passwordRecoveryPending, pathname, stableParams]);

  // Flush before Android may kill the process after a Settings permission change.
  useEffect(() => {
    if (!isInitialized || passwordRecoveryPending) {
      return;
    }

    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        const path = pathnameRef.current;
        if (!path) {
          return;
        }
        persistHref(path, paramsRef.current, lastSaved);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isInitialized, passwordRecoveryPending]);

  return null;
}
