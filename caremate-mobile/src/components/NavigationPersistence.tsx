import { useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import { saveLastAppHref, toRestorableAppHref } from '@/domains/navigation';
import { useAuthStore } from '@/features/auth/store';

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

  useEffect(() => {
    if (!isInitialized || passwordRecoveryPending || !pathname) {
      return;
    }
    const href = toRestorableAppHref(pathname, stableParams);
    if (!href || href === lastSaved.current) {
      return;
    }
    lastSaved.current = href;
    void saveLastAppHref(href);
  }, [isInitialized, passwordRecoveryPending, pathname, stableParams]);

  return null;
}
