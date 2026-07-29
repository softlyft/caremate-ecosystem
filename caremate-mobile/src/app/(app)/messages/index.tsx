import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { useMessageInbox } from '@/domains/messaging/hooks';
import type { MessageConversation } from '@/domains/messaging/repository';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

function formatThreadTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConversationRow({ item }: { item: MessageConversation }) {
  const { t } = useTranslation();
  const title = item.title?.trim() || item.organization_name?.trim() || 'Provider';
  return (
    <Button
      style={styles.row}
      onPress={() => router.push(`/(app)/messages/${item.id}`)}
      accessibilityRole="button"
      variant="plain"
    >
      <View style={styles.avatar}>
        <AppText variant="cardTitle" style={styles.avatarLetter}>
          {title.slice(0, 1).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <AppText variant="cardTitle" style={styles.rowTitle} numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" style={styles.rowTime}>
            {formatThreadTime(item.last_message_at)}
          </AppText>
        </View>
        <View style={styles.rowBottom}>
          <AppText
            variant="caption"
            style={[styles.preview, item.unread ? styles.previewUnread : null]}
            numberOfLines={2}
          >
            {item.kind === 'direct' ? `${t('messages.directBadge')} · ` : ''}
            {item.subject ? `${item.subject} — ` : ''}
            {item.last_message_preview ?? ''}
          </AppText>
          {item.unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Button>
  );
}

export default function MessagesInboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const query = useMessageInbox();

  if (query.isLoading) {
    return <LoadingState title={t('messages.loading')} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('messages.loadFailed')}
        message={t('common.loadFailedMessage')}
        actionLabel={t('common.retry')}
        onAction={() => void query.refetch()}
      />
    );
  }

  const items = query.data ?? [];
  const isEmpty = items.length === 0;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.md }]}>
      {!isEmpty ? (
        <View style={styles.toolbar}>
          <Button
            style={styles.newButton}
            onPress={() => router.push('/(app)/messages/new')}
            accessibilityRole="button"
            accessibilityLabel={t('messages.newMessageA11y')}
            variant="plain"
          >
            <Plus color={palette.primaryDark} size={18} strokeWidth={2.4} />
            <AppText variant="seeAll" style={styles.newButtonLabel}>
              {t('messages.newMessage')}
            </AppText>
          </Button>
        </View>
      ) : null}

      {isEmpty ? (
        <EmptyState
          title={t('messages.emptyTitle')}
          message={t('messages.emptyMessage')}
          actionLabel={t('messages.emptyAction')}
          onAction={() => router.push('/(app)/messages/new')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <ConversationRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  toolbar: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  newButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.22)',
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newButtonLabel: {
    color: palette.primaryDark,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: palette.divider,
    marginLeft: 64,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: palette.primaryDark,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowTitle: {
    flex: 1,
  },
  rowTime: {
    color: palette.textSecondary,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    color: palette.textSecondary,
  },
  previewUnread: {
    color: palette.text,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
  },
});
