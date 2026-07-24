import { BookOpen, CheckCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useArticleReadStatus } from '@/domains/articles/hooks/use-article-read';
import { palette, radius } from '@/theme';

const UNREAD = '#94A3B8';
const READING = palette.brandBlue;
const READ = palette.primary;

/** Color-coded unread / reading / read status icon (no text label). */
export function ArticleReadBadge({ articleId }: { articleId: string }) {
  const { isReading, isRead } = useArticleReadStatus(articleId);

  const color = isRead ? READ : isReading ? READING : UNREAD;
  const label = isRead ? 'Read' : isReading ? 'Reading' : 'Unread';
  const Icon = isRead ? CheckCheck : BookOpen;

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}
    >
      <Icon color={color} size={14} strokeWidth={2.35} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
