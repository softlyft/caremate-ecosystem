import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react-native';
import { Share, StyleSheet, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/form-controls';
import { buildArticleShareContent } from '@/domains/articles/share';
import { isExternalArticle } from '@/domains/articles/utils/evergreen-articles';
import { useTranslation } from '@/domains/localization';
import { palette, radius } from '@/theme';
import type { Article } from '@/types';

interface ArticleShareButtonProps {
  article: Article;
  size?: number;
  style?: ViewStyle;
  hitSlop?: number;
}

/**
 * Share control for CareMate guides only — external news has no share icon.
 * Payload includes a deep link back into CareMate (and cover image URL when set).
 */
export function ArticleShareButton({
  article,
  size = 16,
  style,
  hitSlop = 10,
}: ArticleShareButtonProps) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  if (isExternalArticle(article)) {
    return null;
  }

  async function share() {
    if (sharingRef.current) {
      return;
    }
    sharingRef.current = true;
    setSharing(true);
    const content = buildArticleShareContent(article, {
      continueReading: t('learn.shareContinue'),
    });
    try {
      await Share.share({
        title: content.title,
        message: content.message,
        ...(content.url ? { url: content.url } : {}),
      });
    } catch {
      // User dismissed the sheet or share is unavailable.
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }

  return (
    <Button
      accessibilityLabel={t('learn.shareArticle')}
      accessibilityState={{ busy: sharing }}
      hitSlop={hitSlop}
      disabled={sharing}
      onPress={() => {
        void share();
      }}
      style={[styles.button, style]}
      variant="plain"
    >
      <Share2 color={palette.textSecondary} size={size} strokeWidth={2.25} />
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
  },
});
