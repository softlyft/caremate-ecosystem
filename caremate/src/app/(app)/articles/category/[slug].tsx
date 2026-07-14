import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Box } from '@/components/ui/box';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import {
  CompactArticleCard,
  FeaturedArticleCard,
} from '@/domains/articles/components/ArticleCards';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { articleRepository } from '@/domains/articles/repository';
import { spacing } from '@/theme/colors';
import type { Article } from '@/types';

export default function ArticleCategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;

  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.articleCategories,
    queryFn: () => articleRepository.getCategories(),
  });

  const category = categoriesQuery.data?.find((item) => item.slug === slug);

  const articlesQuery = useQuery({
    queryKey: [...QUERY_KEYS.articles, 'category', category?.id, userKey],
    queryFn: () => articleRepository.findByCategory(category?.id ?? '', userKey),
    enabled: Boolean(category?.id),
  });

  const { featured, rest } = useMemo(() => {
    const articles = articlesQuery.data ?? [];
    if (articles.length === 0) {
      return { featured: null as Article | null, rest: [] as Article[] };
    }
    const [first, ...remaining] = articles;
    return { featured: first, rest: remaining };
  }, [articlesQuery.data]);

  if (categoriesQuery.isLoading || articlesQuery.isLoading) {
    return <LoadingState title="Loading category..." />;
  }

  return (
    <Screen>
      <AppText variant="screenTitle">{category?.name ?? 'Category'}</AppText>
      {featured === null && rest.length === 0 ? (
        <EmptyState title="No articles in this category" />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            featured ? (
              <Box className="mb-3">
                <FeaturedArticleCard article={featured} />
              </Box>
            ) : null
          }
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
