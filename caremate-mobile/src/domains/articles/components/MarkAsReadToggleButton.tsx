import { BookOpen, CheckCheck } from 'lucide-react-native';
import { StyleSheet, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { useArticleReadStatus } from '@/domains/articles/hooks/use-article-read';
import { palette, radius } from '@/theme';

interface MarkAsReadToggleButtonProps {
  articleId: string;
  size?: number;
  style?: ViewStyle;
  hitSlop?: number;
}

const UNREAD = '#94A3B8';
const READING = palette.brandBlue;
const READ = palette.primary;

/** Toggle finished ↔ unread. Icon color reflects unread / reading / read. */
export function MarkAsReadToggleButton({
  articleId,
  size = 16,
  style,
  hitSlop = 10,
}: MarkAsReadToggleButtonProps) {
  const { isRead, isReading, isBusy, toggleRead } = useArticleReadStatus(articleId);
  const color = isRead ? READ : isReading ? READING : UNREAD;
  const Icon = isRead ? CheckCheck : BookOpen;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={isRead ? 'Mark as unread' : 'Mark as read'}
      accessibilityState={{ selected: isRead, busy: isBusy }}
      hitSlop={hitSlop}
      disabled={isBusy}
      onPress={(event) => {
        event?.stopPropagation?.();
        toggleRead();
      }}
      style={[
        styles.button,
        { backgroundColor: `${color}14`, borderColor: `${color}33` },
        isBusy ? styles.buttonBusy : null,
        style,
      ]}
    >
      <Icon color={color} size={size} strokeWidth={2.25} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonBusy: {
    opacity: 0.6,
  },
});
