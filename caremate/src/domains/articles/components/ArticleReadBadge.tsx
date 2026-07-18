import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useArticleReadStatus } from '@/domains/articles/hooks/use-article-read';
import { useTranslation } from '@/domains/localization';
import { palette, radius } from '@/theme';

/** Compact Reading / Read pill for feed cards. */
export function ArticleReadBadge({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const { isReading, isRead } = useArticleReadStatus(articleId);

  if (!isReading && !isRead) {
    return null;
  }

  return (
    <View style={[styles.badge, isRead ? styles.badgeRead : styles.badgeReading]}>
      <AppText
        variant="caption"
        style={isRead ? styles.textRead : styles.textReading}
      >
        {isRead ? t('learn.readBadge') : t('learn.readingBadge')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeReading: {
    backgroundColor: palette.blueLight,
  },
  badgeRead: {
    backgroundColor: palette.primaryLight,
  },
  textReading: {
    color: palette.brandBlue,
    fontSize: 11,
    fontWeight: '600',
  },
  textRead: {
    color: palette.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
});
