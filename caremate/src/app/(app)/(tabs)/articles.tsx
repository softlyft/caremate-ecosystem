import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { Box } from '@/components/ui/box';
import { Input } from '@/components/ui/form-controls';
import { Pressable } from '@/components/ui/pressable';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { Text } from '@/components/ui/text';
import { QUERY_KEYS } from '@/constants/config';
import { HEALTH_CATEGORIES } from '@/features/home/constants';
import {
  HealthCategoriesRow,
  type HealthCategoryId,
} from '@/features/home/components/HealthCategoriesRow';
import {
  CompactArticleCard,
  FeaturedArticleCard,
} from '@/domains/articles/components/ArticleCards';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { articleRepository } from '@/domains/articles/repository';
import { profileRepository } from '@/domains/profile/repository';
import { spacing } from '@/theme/colors';
import type { Article } from '@/types';

function parseCategoryParam(value: string | string[] | undefined): HealthCategoryId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }
  const match = HEALTH_CATEGORIES.find((category) => category.id === raw || category.slug === raw);
  return match?.id ?? null;
}

export default function ArticlesTabScreen() {
  const insets = useSafeAreaInsets();
  const { category: categoryParam, q: queryParam } = useLocalSearchParams<{
    category?: string;
    q?: string;
  }>();
  const initialQuery = Array.isArray(queryParam) ? (queryParam[0] ?? '') : (queryParam ?? '');
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<HealthCategoryId | null>(() =>
    parseCategoryParam(categoryParam),
  );
  const [categoryParamSnapshot, setCategoryParamSnapshot] = useState(categoryParam);
  const [queryParamSnapshot, setQueryParamSnapshot] = useState(queryParam);
  if (categoryParam !== categoryParamSnapshot) {
    setCategoryParamSnapshot(categoryParam);
    setSelectedCategoryId(parseCategoryParam(categoryParam));
  }
  if (queryParam !== queryParamSnapshot) {
    setQueryParamSnapshot(queryParam);
    setSearch(initialQuery);
  }
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });
  const countryCode = profileQuery.data?.countryCode ?? null;

  const articlesQuery = useQuery({
    queryKey: [...QUERY_KEYS.articles, search, userKey, selectedCategoryId ?? 'all'],
    queryFn: async () => {
      const term = search.trim() || undefined;
      if (selectedCategoryId) {
        return articleRepository.findByCategory(selectedCategoryId, userKey, term);
      }
      return articleRepository.findAll(term, userKey);
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function refreshRemoteNews() {
      try {
        await articleRepository.refreshTrendingInBackground({
          isGuest,
          countryCode,
        });
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.articles });
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
        }
      } catch {
        // Keep local evergreen feed if Currents refresh fails.
      }
    }

    if (isGuest || profileQuery.isFetched) {
      void refreshRemoteNews();
    }

    return () => {
      cancelled = true;
    };
  }, [countryCode, isGuest, profileQuery.isFetched, queryClient]);

  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const { featured, rest } = useMemo(() => {
    if (articles.length === 0) {
      return { featured: null as Article | null, rest: [] as Article[] };
    }
    // Keep featured hero only for the unfiltered Learn feed.
    if (search.trim() || selectedCategoryId) {
      return { featured: null, rest: articles };
    }
    const [first, ...remaining] = articles;
    return { featured: first, rest: remaining };
  }, [articles, search, selectedCategoryId]);

  const handleSelectCategory = (categoryId: HealthCategoryId | null) => {
    setSelectedCategoryId(categoryId);
    if (categoryId) {
      router.setParams({ category: categoryId });
      return;
    }
    router.replace('/(app)/(tabs)/articles');
  };

  if (articlesQuery.isLoading) {
    return <LoadingState title="Loading articles..." />;
  }

  const selectedName = selectedCategoryId
    ? HEALTH_CATEGORIES.find((category) => category.id === selectedCategoryId)?.name
    : null;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <OfflineBanner />
        <Input placeholder="Search articles" value={search} onChangeText={setSearch} />
      </View>
      <HealthCategoriesRow
        showSeeAll={false}
        padded={false}
        showAllOption
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />
      <Pressable
        onPress={() => router.push('/(app)/articles/bookmarks')}
        className="active:opacity-70 mb-2"
      >
        <Text size="sm" bold className="text-primary">
          View bookmarks
        </Text>
      </Pressable>
      {articles.length === 0 ? (
        <EmptyState
          title={selectedName ? `No ${selectedName} articles` : 'No articles found'}
          message="Try another search or category."
        />
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
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
