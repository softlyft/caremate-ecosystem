import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Link2, Shield } from 'lucide-react-native';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { PayerDirectoryCard } from '@/domains/payers/components/PayerDirectoryCard';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { PAYER_DIRECTORY_PAGE_SIZE, payerRepository } from '@/domains/payers/repository';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';
import { textColors } from '@/theme/typography';

export default function InsuranceDirectoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { online } = useNetworkStatus();
  const isGuest = useIsGuest();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const trimmedSearch = deferredSearch.trim();

  const activeConnectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'active'],
    queryFn: () => payerConnectionService.listActive(),
    enabled: !isGuest,
  });

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

  const activeOrgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const connection of activeConnectionsQuery.data ?? []) {
      ids.add(connection.payerOrganizationId);
    }
    return ids;
  }, [activeConnectionsQuery.data]);

  const payers = useMemo(() => {
    const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
    if (isGuest || activeOrgIds.size === 0) {
      return rows;
    }
    return rows.filter((payer) => !activeOrgIds.has(payer.id));
  }, [activeOrgIds, isGuest, query.data]);

  if (query.isLoading && query.data === undefined) {
    return (
      <Screen tone="background" padded={false}>
        <LoadingState title={t('insurance.loading')} />
      </Screen>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <Screen tone="background" padded={false}>
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
      </Screen>
    );
  }

  return (
    <Screen tone="background" padded={false}>
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

            {!isGuest ? (
              <AnimatedSection index={1}>
                <View style={[styles.connectionsBanner, shadow.soft]}>
                  <AppText variant="body" style={styles.connectionsBannerText}>
                    {t('insurance.connections.manageInConnectionsHint')}
                  </AppText>
                  <Button
                    style={styles.connectionsBannerButton}
                    onPress={() => router.push('/(app)/providers/connections' as Href)}
                    variant="plain"
                  >
                    <Link2 color={palette.primary} size={16} />
                    <AppText variant="button" style={styles.connectionsBannerLabel}>
                      {t('insurance.connections.openConnections')}
                    </AppText>
                  </Button>
                </View>
              </AnimatedSection>
            ) : null}

            {!online ? (
              <AppText variant="caption" style={styles.statusNote}>
                {t('insurance.offline')}
              </AppText>
            ) : null}

            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={t('insurance.searchPlaceholder')}
              onClear={() => setSearch('')}
            />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  listFill: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  connectionsBanner: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.sm,
  },
  connectionsBannerText: {
    color: textColors.secondary,
  },
  connectionsBannerButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 0,
  },
  connectionsBannerLabel: {
    color: palette.primary,
  },
});
