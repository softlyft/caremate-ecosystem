import { useEffect, useState } from 'react';

import { isOnline, watchNetworkStatus } from '@/sync/network';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    let stopWatching: (() => void) | undefined;

    isOnline().then((status) => {
      if (mounted) {
        setOnline(status);
      }
    });

    watchNetworkStatus((status) => {
      if (mounted) {
        setOnline(status);
      }
    }).then((unsubscribe) => {
      stopWatching = unsubscribe;
    });

    return () => {
      mounted = false;
      stopWatching?.();
    };
  }, []);

  return { online };
}
