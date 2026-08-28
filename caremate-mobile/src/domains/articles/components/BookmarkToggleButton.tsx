import { Bookmark } from 'lucide-react-native';
import { StyleSheet, ViewStyle } from 'react-native';

import { Button } from '@/components/ui/form-controls';
import { useArticleBookmark } from '@/domains/articles/hooks/use-article-bookmark';
import { palette, primaryAlpha, radius } from '@/theme';

interface BookmarkToggleButtonProps {
  articleId: string;
  size?: number;
  style?: ViewStyle;
  /** Larger tap target for cards nested inside another pressable. */
  hitSlop?: number;
}

export function BookmarkToggleButton({
  articleId,
  size = 16,
  style,
  hitSlop = 10,
}: BookmarkToggleButtonProps) {
  const { isBookmarked, isToggling, toggle } = useArticleBookmark(articleId);

  return (
    <Button
      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
      accessibilityState={{ selected: isBookmarked, busy: isToggling }}
      hitSlop={hitSlop}
      disabled={isToggling}
      onPress={() => {
        toggle();
      }}
      style={[
        styles.button,
        isBookmarked ? styles.buttonActive : null,
        isToggling ? styles.buttonBusy : null,
        style,
      ]}
      variant="plain"
    >
      <Bookmark
        color={isBookmarked ? palette.primary : palette.textSecondary}
        fill={isBookmarked ? palette.primary : 'transparent'}
        size={size}
        strokeWidth={2.25}
      />
    </Button>
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
    borderColor: primaryAlpha(0.25),
  },
  buttonBusy: {
    opacity: 0.6,
  },
});
