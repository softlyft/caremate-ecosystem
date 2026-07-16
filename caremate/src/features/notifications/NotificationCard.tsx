import { Bell, BellRing } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import type { InAppNotification } from '@/domains/notifications/types';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = '#4F46E5';
const ACCENT_SOFT = '#EEF2FF';
const ACCENT_MID = '#C7D2FE';

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
  const Icon = unread ? BellRing : Bell;

  return (
    <View
      accessibilityRole="text"
      style={[styles.card, shadow.soft, unread ? styles.cardUnread : styles.cardRead]}
    >
      <LinearGradientFill
        colors={
          unread
            ? [
                { offset: '0%', color: ACCENT_SOFT },
                { offset: '55%', color: '#F5F3FF' },
                { offset: '100%', color: '#FFFFFF' },
              ]
            : [
                { offset: '0%', color: '#F8FAFC' },
                { offset: '100%', color: '#FFFFFF' },
              ]
        }
        angle={128}
        style={styles.gradient}
      >
        {unread ? <View style={styles.accentBar} /> : null}

        <View style={styles.row}>
          <View
            style={[
              styles.iconBadge,
              unread ? { backgroundColor: ACCENT_MID } : { backgroundColor: '#F1F5F9' },
            ]}
          >
            <Icon color={unread ? ACCENT : '#64748B'} size={18} strokeWidth={2.2} />
          </View>

          <View style={styles.copy}>
            <View style={styles.header}>
              <AppText variant="cardTitle" style={styles.title} numberOfLines={2}>
                {notification.title}
              </AppText>
              {unread ? <View style={styles.dot} /> : null}
            </View>
            <AppText variant="quickActionSubtitle" style={styles.body}>
              {notification.body}
            </AppText>
            <AppText variant="caption" style={[styles.time, unread ? styles.timeUnread : null]}>
              {formatRelativeTime(notification.createdAt)}
            </AppText>
          </View>
        </View>
      </LinearGradientFill>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: palette.background,
  },
  cardUnread: {
    borderColor: 'rgba(79, 70, 229, 0.28)',
  },
  cardRead: {
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  gradient: {
    padding: spacing.md,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: ACCENT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: palette.text,
    letterSpacing: -0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: ACCENT,
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
  timeUnread: {
    color: '#6366F1',
    fontFamily: fontFamily.semiBold,
  },
});
