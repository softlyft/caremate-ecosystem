import { CheckCheck } from 'lucide-react-native';
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

/** Toggle finished ↔ unread. Does not mark "currently reading" (detail screen does). */
export function MarkAsReadToggleButton({
  articleId,
  size = 16,
  style,
  hitSlop = 10,
}: MarkAsReadToggleButtonProps) {
  const { isRead, isBusy, toggleRead } = useArticleReadStatus(articleId);

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
        isRead ? styles.buttonActive : null,
        isBusy ? styles.buttonBusy : null,
        style,
      ]}
    >
      <CheckCheck
        color={isRead ? palette.primary : palette.textSecondary}
        size={size}
        strokeWidth={2.25}
      />
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  buttonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  buttonBusy: {
    opacity: 0.6,
  },
});
