import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookOpen, CheckCheck, Search } from 'lucide-react-native';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import {
  CompactArticleCard,
  FeaturedArticleCard,
} from '@/domains/articles/components/ArticleCards';
import { articleRepository } from '@/domains/articles/repository';
import { useTranslation } from '@/domains/localization';
import { AdSlot } from '@/features/ads/AdSlot';
import { HEALTH_CATEGORIES } from '@/features/home/constants';
import {
  HealthCategoriesRow,
  type HealthCategoryId,
} from '@/features/home/components/HealthCategoriesRow';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';
import type { Article } from '@/types';

const LIST_PAGE_SIZE = 10;

function parseCategoryParam(value: string | string[] | undefined): HealthCategoryId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }
  const match = HEALTH_CATEGORIES.find((category) => category.id === raw || category.slug === raw);
  return match?.id ?? null;
}

export default function ArticlesTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { category: categoryParam, q: queryParam } = useLocalSearchParams<{
    category?: string;
    q?: string;
  }>();
  const initialQuery = Array.isArray(queryParam) ? (queryParam[0] ?? '') : (queryParam ?? '');
  const [search, setSearch] = useState(initialQuery);
  const deferredSearch = useDeferredValue(search);
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
  const { isReady: localizationReady, newsCountryCode } = useLocalizationPreferences();
  const trimmedSearch = deferredSearch.trim();

  const articlesQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.articles,
      trimmedSearch,
      userKey,
      selectedCategoryId ?? 'news',
      newsCountryCode,
    ],
    queryFn: async () => {
      const term = trimmedSearch || undefined;
      if (selectedCategoryId) {
        return articleRepository.findByCategory(selectedCategoryId, userKey, term);
      }
      return articleRepository.findNews(term, newsCountryCode);
    },
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    let cancelled = false;

    async function refreshCatalog() {
      try {
        await articleRepository.pullFromRemote();
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.articles });
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
        }
      } catch {
        // Keep local evergreen feed if catalog pull fails.
      }
    }

    if (localizationReady) {
      void refreshCatalog();
    }

    return () => {
      cancelled = true;
    };
  }, [localizationReady, queryClient]);

  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);
  const showInitialLoader =
    articlesQuery.isPending && articlesQuery.data === undefined && !trimmedSearch;

  const { featured, rest } = useMemo(() => {
    if (articles.length === 0) {
      return { featured: null as Article | null, rest: [] as Article[] };
    }
    if (trimmedSearch) {
      return { featured: null, rest: articles };
    }
    const [first, ...remaining] = articles;
    return { featured: first, rest: remaining };
  }, [articles, trimmedSearch]);

  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const listFilterKey = `${trimmedSearch}|${selectedCategoryId ?? 'news'}`;
  const [listFilterSnapshot, setListFilterSnapshot] = useState(listFilterKey);
  if (listFilterKey !== listFilterSnapshot) {
    setListFilterSnapshot(listFilterKey);
    setVisibleCount(LIST_PAGE_SIZE);
  }

  const visibleRest = useMemo(() => rest.slice(0, visibleCount), [rest, visibleCount]);
  const hasMore = rest.length > visibleCount;

  const handleEndReached = () => {
    if (hasMore) {
      setVisibleCount((count) => count + LIST_PAGE_SIZE);
    }
  };

  const handleSelectCategory = (categoryId: HealthCategoryId | null) => {
    setSelectedCategoryId(categoryId);
    router.setParams({ category: categoryId ?? '' });
  };

  if (showInitialLoader) {
    return (
      <View style={styles.screen}>
        <LoadingState title={t('learn.loading')} />
      </View>
    );
  }

  const selectedName = selectedCategoryId
    ? (HEALTH_CATEGORIES.find((category) => category.id === selectedCategoryId)?.name ??
      selectedCategoryId)
    : t('learn.news');

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleRest}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.sm },
          articles.length === 0 ? styles.listFill : null,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AnimatedSection index={0}>
              <View style={styles.hero}>
                <View style={styles.meshTop} />
                <View style={styles.meshAccent} />
                <View style={styles.heroBadge}>
                  <BookOpen color={palette.primary} size={15} strokeWidth={2.25} />
                  <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                    {t('learn.articleCount', { count: articles.length })}
                  </AppText>
                </View>
                <View style={styles.titleRow}>
                  <AppText variant="screenTitle" style={styles.title}>
                    {t('learn.title')}
                  </AppText>
                  <View style={styles.libraryActions}>
                    <Button
                      style={styles.iconCta}
                      onPress={() => router.push('/(app)/articles/reading')}
                      accessibilityRole="button"
                      accessibilityLabel={t('learn.reading')}
                      variant="plain"
                    >
                      <CheckCheck color={palette.primary} size={18} strokeWidth={2.25} />
                    </Button>
                    <Button
                      style={styles.iconCta}
                      onPress={() => router.push('/(app)/articles/bookmarks')}
                      accessibilityRole="button"
                      accessibilityLabel={t('learn.bookmarks')}
                      variant="plain"
                    >
                      <Bookmark color={palette.primary} size={18} strokeWidth={2.25} />
                    </Button>
                  </View>
                </View>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {t('learn.subtitle')}
                </AppText>
              </View>
            </AnimatedSection>

            <OfflineBanner flush />

            <View style={[styles.searchShell, shadow.soft]}>
              <View style={styles.searchIcon}>
                <Search color={palette.primary} size={16} strokeWidth={2.5} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t('learn.searchPlaceholder')}
                placeholderTextColor={textColors.placeholder}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {articlesQuery.isFetching && (trimmedSearch || selectedCategoryId) ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : null}
            </View>

            <HealthCategoriesRow
              showHeader={false}
              showSeeAll={false}
              padded={false}
              showNewsOption
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
            />

            {featured ? (
              <View style={styles.featuredWrap}>
                <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                  {t('learn.featured')}
                </AppText>
                <FeaturedArticleCard article={featured} />
              </View>
            ) : null}

            <AdSlot slotId={AD_SLOTS.LEARN_LIST} />

            {rest.length > 0 ? (
              <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                {selectedName}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={
              selectedCategoryId
                ? t('learn.empty.categoryTitle', { category: selectedName })
                : t('learn.empty.newsTitle')
            }
            message={t('learn.empty.message')}
          />
        }
        renderItem={({ item }) => <CompactArticleCard article={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.listFooter}>
              <ActivityIndicator color={palette.primary} size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: 40,
  },
  listFill: {
    flexGrow: 1,
  },
  listFooter: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
    paddingBottom: spacing.xs,
  },
  meshTop: {
    position: 'absolute',
    top: -70,
    right: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: palette.primaryLight,
    opacity: 0.6,
  },
  meshAccent: {
    position: 'absolute',
    top: 36,
    left: -56,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: palette.purpleLight,
    opacity: 0.45,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.14)',
    zIndex: 1,
  },
  heroBadgeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 11,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    zIndex: 1,
  },
  libraryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    letterSpacing: -0.6,
  },
  subtitle: {
    zIndex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    maxWidth: '95%',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: palette.text,
    paddingVertical: 4,
  },
  bookmarksCta: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  iconCta: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.16)',
  },
  featuredWrap: {
    gap: 8,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
});
