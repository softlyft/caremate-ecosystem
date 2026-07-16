import { RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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

export function SyncStatusBanner() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [summary, setSummary] = useState<SyncQueueSummary>(EMPTY_SUMMARY);
  const [isRetrying, setIsRetrying] = useState(false);

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

  if (!isAuthenticated || summary.pendingCount + summary.failedCount === 0) {
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
    gap: 12,
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
});
