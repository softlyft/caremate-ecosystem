import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { CompactArticleCard } from '@/domains/articles/components/ArticleCards';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { articleRepository } from '@/domains/articles/repository';
import { spacing } from '@/theme/colors';

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.bookmarks, userId],
    queryFn: () => articleRepository.getBookmarks(userId),
  });

  if (query.isLoading) {
    return <LoadingState title={t('learn.loadingBookmarks')} />;
  }

  const bookmarks = query.data ?? [];

  return (
    <Screen>
      {bookmarks.length === 0 ? (
        <EmptyState
          title={t('learn.bookmarksEmpty.title')}
          message={t('learn.bookmarksEmpty.message')}
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CompactArticleCard article={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 12,
  },
});
