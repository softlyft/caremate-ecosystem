import { RefreshCw, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useAuthStore } from '@/features/auth/store';
import { syncEngine } from '@/sync/engine';
import {
  getSyncQueueSummary,
  retryFailedSyncOperations,
  subscribeToSyncQueue,
  type SyncQueueSummary,
} from '@/sync/queue';
import { palette } from '@/theme';

const EMPTY_SUMMARY: SyncQueueSummary = { pendingCount: 0, failedCount: 0 };
/** Auto-hide the banner after this many ms once it appears. */
const AUTO_DISMISS_MS = 5_000;

function summaryKey(summary: SyncQueueSummary): string {
  return `${summary.pendingCount}:${summary.failedCount}`;
}

export function SyncStatusBanner() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [summary, setSummary] = useState<SyncQueueSummary>(EMPTY_SUMMARY);
  const [isRetrying, setIsRetrying] = useState(false);
  /** Summary key that was dismissed (manual or auto). New keys re-show the banner. */
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await getSyncQueueSummary());
    } catch {
      // Database availability is handled by the bootstrap gate.
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const initialRefresh = setTimeout(() => {
      void refreshSummary();
    }, 0);
    const unsubscribeQueue = subscribeToSyncQueue(() => {
      void refreshSummary();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshSummary();
      }
    });

    return () => {
      clearTimeout(initialRefresh);
      unsubscribeQueue();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, refreshSummary]);

  const hasItems = summary.pendingCount + summary.failedCount > 0;
  const key = summaryKey(summary);
  const visible = isAuthenticated && hasItems && dismissedKey !== key;

  // Auto-dismiss a few seconds after becoming visible.
  useEffect(() => {
    if (!visible) {
      clearDismissTimer();
      return;
    }

    clearDismissTimer();
    dismissTimer.current = setTimeout(() => {
      setDismissedKey(key);
      dismissTimer.current = null;
    }, AUTO_DISMISS_MS);

    return clearDismissTimer;
  }, [clearDismissTimer, key, visible]);

  if (!visible) {
    return null;
  }

  const hasFailures = summary.failedCount > 0;
  const message = hasFailures
    ? `${summary.failedCount} ${summary.failedCount === 1 ? 'change' : 'changes'} couldn't sync${
        summary.pendingCount > 0 ? `; ${summary.pendingCount} still waiting` : ''
      }.`
    : `${summary.pendingCount} ${
        summary.pendingCount === 1 ? 'change is' : 'changes are'
      } waiting to sync.`;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (hasFailures) {
        await retryFailedSyncOperations();
      }
      await syncEngine.runSyncCycle({ reason: 'manual-retry' });
      await refreshSummary();
    } catch {
      await refreshSummary();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.container, hasFailures ? styles.failedContainer : styles.pendingContainer]}
    >
      <AppText variant="quickActionSubtitle" style={styles.message}>
        {message}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasFailures ? 'Retry failed sync' : 'Sync now'}
        disabled={isRetrying}
        onPress={() => void handleRetry()}
        style={styles.action}
      >
        {isRetrying ? (
          <ActivityIndicator color={palette.primaryDark} size="small" />
        ) : (
          <RefreshCw color={palette.primaryDark} size={16} strokeWidth={2.5} />
        )}
        <AppText variant="categoryPill" color={palette.primaryDark}>
          {isRetrying ? 'Syncing' : hasFailures ? 'Retry' : 'Sync now'}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss sync status"
        hitSlop={8}
        onPress={() => {
          clearDismissTimer();
          setDismissedKey(key);
        }}
        style={styles.dismiss}
      >
        <X color={palette.textSecondary} size={16} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingContainer: {
    backgroundColor: palette.primaryLight,
    borderBottomColor: palette.primary,
  },
  failedContainer: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: palette.danger,
  },
  message: {
    flex: 1,
    color: palette.text,
  },
  action: {
    minHeight: 36,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});
