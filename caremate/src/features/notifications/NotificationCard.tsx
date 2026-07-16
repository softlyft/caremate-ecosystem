import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { InAppNotification } from '@/domains/notifications/types';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) {
    return '';
  }
  const deltaSec = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (deltaSec < 60) {
    return 'Just now';
  }
  if (deltaSec < 3600) {
    const minutes = Math.floor(deltaSec / 60);
    return `${minutes}m ago`;
  }
  if (deltaSec < 86_400) {
    const hours = Math.floor(deltaSec / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(deltaSec / 86_400);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

type NotificationCardProps = {
  notification: InAppNotification;
};

/** Read-only inbox card — title + body only (no CTA). */
export function NotificationCard({ notification }: NotificationCardProps) {
  const unread = !notification.readAt;

  return (
    <View
      accessibilityRole="text"
      style={[styles.card, shadow.soft, unread ? styles.cardUnread : null]}
    >
      <View style={styles.header}>
        <AppText variant="cardTitle" style={styles.title} numberOfLines={2}>
          {notification.title}
        </AppText>
        {unread ? <View style={styles.dot} /> : null}
      </View>
      <AppText variant="quickActionSubtitle" style={styles.body}>
        {notification.body}
      </AppText>
      <AppText variant="caption" style={styles.time}>
        {formatRelativeTime(notification.createdAt)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.background,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardUnread: {
    borderColor: `${palette.primary}55`,
    backgroundColor: palette.primaryLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: palette.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: palette.primary,
  },
  body: {
    color: palette.textSecondary,
    lineHeight: 22,
  },
  time: {
    marginTop: 2,
    color: palette.textSecondary,
    fontFamily: fontFamily.medium,
  },
});
