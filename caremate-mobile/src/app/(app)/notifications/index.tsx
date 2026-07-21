import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { useNotificationsInbox } from '@/domains/notifications/hooks';
import { markNotificationsRead } from '@/domains/notifications/service';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { layoutSpacing, spacing } from '@/theme';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const query = useNotificationsInbox();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          await markNotificationsRead(userId);
          if (active) {
            await query.refetch();
          }
        } catch {
          // Read-state update is best-effort.
        }
      })();
      return () => {
        active = false;
      };
      // Intentionally depend on userId + refetch only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, query.refetch]),
  );

  if (query.isLoading) {
    return <LoadingState title={t('home.notifications.loading')} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('home.notifications.loadFailed')}
        message={t('common.loadFailedMessage')}
        actionLabel={t('common.retry')}
        onAction={() => void query.refetch()}
      />
    );
  }

  const items = query.data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title={t('home.notifications.emptyTitle')}
        message={t('home.notifications.emptyMessage')}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.md }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <NotificationCard notification={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
});
