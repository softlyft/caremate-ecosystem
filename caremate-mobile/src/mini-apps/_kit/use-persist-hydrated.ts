import { useEffect, useState } from 'react';

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (fn: () => void) => () => void;
};

/** Shared hydrated flag for Zustand persist stores. */
export function usePersistHydrated(persist: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(() => persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated, persist]);

  return hydrated;
}
