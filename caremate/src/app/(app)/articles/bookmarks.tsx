import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { CompactArticleCard } from '@/domains/articles/components/ArticleCards';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { articleRepository } from '@/domains/articles/repository';
import { spacing } from '@/theme/colors';

export default function BookmarksScreen() {
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.bookmarks, userId],
    queryFn: () => articleRepository.getBookmarks(userId),
  });

  if (query.isLoading) {
    return <LoadingState title="Loading bookmarks..." />;
  }

  const bookmarks = query.data ?? [];

  return (
    <Screen>
      {bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          message="Bookmark articles to read them offline later."
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CompactArticleCard article={item} />}
          ItemSeparatorComponent={() => <Box className="h-3" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
});
