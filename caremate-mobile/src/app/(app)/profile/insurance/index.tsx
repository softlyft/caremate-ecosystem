import { useInfiniteQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Search, Shield } from 'lucide-react-native';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { PayerDirectoryCard } from '@/domains/payers/components/PayerDirectoryCard';
import { PAYER_DIRECTORY_PAGE_SIZE, payerRepository } from '@/domains/payers/repository';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

export default function InsuranceDirectoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { online } = useNetworkStatus();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const trimmedSearch = deferredSearch.trim();

  const query = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.payers, trimmedSearch],
    queryFn: ({ pageParam }) =>
      payerRepository.listPage({
        search: trimmedSearch,
        page: pageParam,
        pageSize: PAYER_DIRECTORY_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 30_000,
  });

  const payers = useMemo(() => query.data?.pages.flatMap((page) => page.rows) ?? [], [query.data]);

  if (query.isLoading && query.data === undefined) {
    return (
      <View style={styles.screen}>
        <LoadingState title={t('insurance.loading')} />
      </View>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <View style={styles.screen}>
        <ErrorState
          title={t('insurance.loadFailed.title')}
          message={
            query.error instanceof Error ? query.error.message : t('insurance.loadFailed.message')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void query.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={payers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.sm },
          payers.length === 0 ? styles.listFill : null,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AnimatedSection index={0}>
              <View style={styles.hero}>
                <View style={styles.meshTop} />
                <View style={styles.meshAccent} />
                <View style={styles.heroBadge}>
                  <Shield color={palette.primary} size={15} strokeWidth={2.25} />
                  <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                    {t('insurance.count', { count: payers.length })}
                  </AppText>
                </View>
                <AppText variant="screenTitle" style={styles.title}>
                  {t('insurance.title')}
                </AppText>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {t('insurance.subtitle')}
                </AppText>
              </View>
            </AnimatedSection>

            <OfflineBanner flush />

            {!online ? (
              <AppText variant="caption" style={styles.statusNote}>
                {t('insurance.offline')}
              </AppText>
            ) : null}

            <View style={[styles.searchShell, shadow.soft]}>
              <View style={styles.searchIcon}>
                <Search color={palette.primary} size={16} strokeWidth={2.5} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t('insurance.searchPlaceholder')}
                placeholderTextColor={textColors.placeholder}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PayerDirectoryCard
            payer={item}
            typeLabel={t('insurance.orgType')}
            onPress={() => router.push(`/(app)/profile/insurance/${item.id}` as Href)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={trimmedSearch ? t('insurance.empty.searchTitle') : t('insurance.empty.title')}
            message={
              trimmedSearch ? t('insurance.empty.searchMessage') : t('insurance.empty.message')
            }
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={palette.primary} />
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
    backgroundColor: palette.background,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  listFill: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    ...shadow.soft,
  },
  meshTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E0E7FF',
    opacity: 0.55,
    top: -70,
    right: -40,
  },
  meshAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.primaryLight,
    opacity: 0.5,
    bottom: -50,
    left: -30,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  heroBadgeLabel: {
    fontWeight: '600',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: textColors.secondary,
  },
  statusNote: {
    color: textColors.secondary,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: textColors.primary,
    paddingVertical: spacing.sm,
  },
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
