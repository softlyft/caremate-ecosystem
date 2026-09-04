import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { useNotificationsInbox } from '@/domains/notifications/hooks';
import { markNotificationsRead } from '@/domains/notifications/service';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, spacing } from '@/theme';

function NotificationDivider() {
  return <View style={styles.divider} />;
}

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
    <Screen
      padded={false}
      style={{ paddingBottom: insets.bottom + spacing.md, backgroundColor: palette.background }}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={NotificationDivider}
        renderItem={({ item }) => <NotificationCard notification={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 32 + spacing.sm,
  },
});
