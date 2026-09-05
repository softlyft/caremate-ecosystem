import { Bell, BellRing } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { InAppNotification } from '@/domains/notifications/types';
import { fontFamily, palette, radius, spacing } from '@/theme';

const ACCENT = '#4F46E5';

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

/** Compact inbox row — title + body + time (no CTA). */
export function NotificationCard({ notification }: NotificationCardProps) {
  const unread = !notification.readAt;
  const Icon = unread ? BellRing : Bell;

  return (
    <View accessibilityRole="text" style={[styles.row, unread ? styles.rowUnread : null]}>
      <View style={[styles.iconBadge, unread ? styles.iconUnread : styles.iconRead]}>
        <Icon color={unread ? ACCENT : '#64748B'} size={16} strokeWidth={2.2} />
      </View>

      <View style={styles.copy}>
        <View style={styles.header}>
          <AppText
            variant="body"
            style={[styles.title, unread ? styles.titleUnread : null]}
            numberOfLines={1}
          >
            {notification.title}
          </AppText>
          <AppText variant="caption" style={[styles.time, unread ? styles.timeUnread : null]}>
            {formatRelativeTime(notification.createdAt)}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.body} numberOfLines={2}>
          {notification.body}
        </AppText>
      </View>

      {unread ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  rowUnread: {
    backgroundColor: 'rgba(79, 70, 229, 0.04)',
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  iconUnread: {
    backgroundColor: '#E0E7FF',
  },
  iconRead: {
    backgroundColor: '#F1F5F9',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: palette.text,
    fontFamily: fontFamily.medium,
    letterSpacing: -0.1,
  },
  titleUnread: {
    fontFamily: fontFamily.semiBold,
    color: palette.text,
  },
  body: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  time: {
    color: palette.textSecondary,
    fontFamily: fontFamily.medium,
    flexShrink: 0,
  },
  timeUnread: {
    color: '#6366F1',
    fontFamily: fontFamily.semiBold,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: ACCENT,
  },
});
