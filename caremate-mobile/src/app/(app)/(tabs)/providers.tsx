import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Heart, MapPinned } from 'lucide-react-native';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import { TabFlatList, iosTabScrollProps, tabContentPaddingTop } from '@/components/navigation/tab-scroll';
import { applyAppStateChange, createAppBackgroundGate } from '@/sync/app-state';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';
import { SearchField } from '@/components/ui/search-field';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { useTranslation } from '@/domains/localization';
import {
  NearbyProviderCard,
  getProviderTypeTheme,
} from '@/domains/providers/components/NearbyProviderCard';
import { enableNearbyLocationAccess, resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { PRIMARY_PROVIDER_TYPES, type ProviderType } from '@/domains/providers/types';
import { AdSlot } from '@/features/ads/AdSlot';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const NEARBY_RESULT_LIMIT = 15;

export default function ProvidersTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { online } = useNetworkStatus();
  const { q: queryParam } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(queryParam) ? (queryParam[0] ?? '') : (queryParam ?? '');
  const [filter, setFilter] = useState<ProviderType>(PRIMARY_PROVIDER_TYPES[0]);
  const [search, setSearch] = useState(initialQuery);
  const deferredSearch = useDeferredValue(search);
  const [queryParamSnapshot, setQueryParamSnapshot] = useState(queryParam);
  if (queryParam !== queryParamSnapshot) {
    setQueryParamSnapshot(queryParam);
    setSearch(initialQuery);
  }

  const filters = useMemo(
    () =>
      PRIMARY_PROVIDER_TYPES.map((type) => ({
        label: t(`home.providerTypes.${type}`),
        value: type as ProviderType,
      })),
    [t],
  );

  const coordsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providers, 'coords'],
    queryFn: resolveNearbyCoords,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const trimmedSearch = deferredSearch.trim();
  const isSearching = trimmedSearch.length > 0;
  const hasUsableCoords = coordsQuery.data?.latitude != null && coordsQuery.data?.longitude != null;
  const needsLocationSetup = !isSearching && !hasUsableCoords;
  const usingLastKnown = Boolean(coordsQuery.data?.usingLastKnown);
  const permissionBlocked = Boolean(coordsQuery.data?.permissionBlocked);

  const [locationRequestPending, setLocationRequestPending] = useState(false);
  const handleEnableLocation = async () => {
    if (locationRequestPending) {
      return;
    }
    setLocationRequestPending(true);
    try {
      await enableNearbyLocationAccess();
      await coordsQuery.refetch();
    } finally {
      setLocationRequestPending(false);
    }
  };

  const appBackgroundGateRef = useRef(createAppBackgroundGate(AppState.currentState));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (applyAppStateChange(appBackgroundGateRef.current, state).shouldForegroundSync) {
        void coordsQuery.refetch();
      }
    });
    return () => sub.remove();
    // refetch is stable enough for resume-from-Settings; avoid depending on the whole query object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-subscribe if refetch identity changes
  }, [coordsQuery.refetch]);

  const providersQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.providers,
      isSearching ? 'search' : 'nearby',
      filter,
      trimmedSearch,
      coordsQuery.data?.latitude,
      coordsQuery.data?.longitude,
      coordsQuery.data?.precision,
    ],
    queryFn: async () => {
      if (isSearching) {
        return providerRepository.searchByName({
          search: trimmedSearch,
          type: filter,
        });
      }

      const coords = coordsQuery.data ?? (await resolveNearbyCoords());
      if (coords.latitude == null || coords.longitude == null) {
        return { providers: [], source: 'remote' as const };
      }

      return providerRepository.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        type: filter,
        limit: NEARBY_RESULT_LIMIT,
      });
    },
    enabled: isSearching || ((coordsQuery.isSuccess || coordsQuery.isError) && !needsLocationSetup),
    staleTime: isSearching ? 30_000 : 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const providers = useMemo(
    () => (needsLocationSetup ? [] : (providersQuery.data?.providers ?? [])),
    [needsLocationSetup, providersQuery.data],
  );
  const source = providersQuery.data?.source;

  if (
    (coordsQuery.isLoading || (!needsLocationSetup && !isSearching && providersQuery.isLoading)) &&
    providersQuery.data === undefined &&
    coordsQuery.data === undefined
  ) {
    return (
      <Screen padded={false}>
        <LoadingState title={t('nearby.loading')} />
      </Screen>
    );
  }

  if (!needsLocationSetup && providersQuery.isError && providersQuery.data === undefined) {
    return (
      <Screen padded={false}>
        <ErrorState
          title={t('nearby.loadFailed.title')}
          message={
            providersQuery.error instanceof Error
              ? providersQuery.error.message
              : t('nearby.loadFailed.message')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void coordsQuery.refetch();
            void providersQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TabFlatList
        data={providers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...iosTabScrollProps}
        contentContainerStyle={[
          styles.list,
          { paddingTop: tabContentPaddingTop(insets.top) },
          providers.length === 0 ? styles.listFill : null,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AnimatedSection index={0}>
              <View style={styles.hero}>
                <View style={styles.meshTop} />
                <View style={styles.meshAccent} />
                <View style={styles.heroBadge}>
                  <MapPinned color={palette.primary} size={15} strokeWidth={2.25} />
                  <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                    {isSearching
                      ? t('nearby.searchCount', { count: providers.length })
                      : t('nearby.nearbyCount', { count: providers.length })}
                  </AppText>
                </View>
                <View style={styles.titleRow}>
                  <AppText variant="screenTitle" style={styles.title}>
                    {t('nearby.title')}
                  </AppText>
                  <Button
                    style={styles.favoritesCta}
                    onPress={() => router.push('/(app)/providers/favorites')}
                    accessibilityRole="button"
                    accessibilityLabel={t('nearby.favorites.openA11y')}
                    variant="plain"
                  >
                    <Heart color={palette.brandBlue} size={18} strokeWidth={2.25} />
                  </Button>
                </View>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {t('nearby.subtitle')}
                </AppText>
              </View>
            </AnimatedSection>

            <OfflineBanner flush />

            {!online || source === 'cache' ? (
              <AppText variant="caption" style={styles.statusNote}>
                {t('nearby.empty.offline')}
              </AppText>
            ) : null}

            {!isSearching && usingLastKnown ? (
              <View style={styles.lastKnownBanner}>
                <AppText variant="caption" style={styles.statusNote}>
                  {t('nearby.lastKnown.message')}
                </AppText>
                <Button
                  accessibilityRole="button"
                  onPress={() => {
                    void handleEnableLocation();
                  }}
                  style={styles.lastKnownAction}
                  variant="plain"
                >
                  <AppText variant="caption" color="brand" style={styles.lastKnownActionLabel}>
                    {locationRequestPending
                      ? t('nearby.locationNeeded.enabling')
                      : permissionBlocked
                        ? t('nearby.lastKnown.openSettings')
                        : t('nearby.lastKnown.action')}
                  </AppText>
                </Button>
              </View>
            ) : null}

            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={t('nearby.searchPlaceholder')}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              decelerationRate="fast"
            >
              {filters.map((item) => {
                const active = item.value === filter;
                const theme = getProviderTypeTheme(item.value);
                const Icon = theme.icon;
                const iconBg = theme.soft;
                const iconColor = theme.accent;

                return (
                  <Button
                    key={item.value}
                    style={[
                      styles.chip,
                      active ? styles.chipSelected : null,
                      active
                        ? {
                            borderColor: theme.accent,
                            backgroundColor: theme.soft,
                          }
                        : null,
                      shadow.soft,
                    ]}
                    onPress={() => setFilter(item.value)}
                    variant="plain"
                  >
                    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                      <Icon color={iconColor} size={15} strokeWidth={2.25} />
                    </View>
                    <AppText variant="categoryPill">{item.label}</AppText>
                  </Button>
                );
              })}
            </ScrollView>

            <AdSlot slotId={AD_SLOTS.NEARBY_LIST} />
          </View>
        }
        ListEmptyComponent={
          needsLocationSetup ? (
            <EmptyState
              title={
                permissionBlocked
                  ? t('nearby.locationNeeded.blockedTitle')
                  : t('nearby.locationNeeded.title')
              }
              message={
                permissionBlocked
                  ? t('nearby.locationNeeded.blockedMessage')
                  : t('nearby.locationNeeded.message')
              }
              actionLabel={
                locationRequestPending
                  ? t('nearby.locationNeeded.enabling')
                  : permissionBlocked
                    ? t('nearby.locationNeeded.openSettings')
                    : t('nearby.locationNeeded.action')
              }
              onAction={() => {
                void handleEnableLocation();
              }}
            />
          ) : providersQuery.isFetching ? (
            <LoadingState title={isSearching ? t('nearby.searching') : t('nearby.loading')} />
          ) : (
            <EmptyState
              title={isSearching ? t('nearby.searchEmpty.title') : t('nearby.empty.title')}
              message={
                isSearching
                  ? t('nearby.searchEmpty.message')
                  : online
                    ? t('nearby.empty.message')
                    : t('nearby.empty.offline')
              }
            />
          )
        }
        renderItem={({ item }) => (
          <NearbyProviderCard
            provider={item}
            onPress={() => router.push(`/(app)/providers/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: 40,
  },
  listFill: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: layoutSpacing.welcomeToSubtitle,
    paddingBottom: spacing.xs,
  },
  meshTop: {
    position: 'absolute',
    top: -70,
    right: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: palette.blueLight,
    opacity: 0.65,
  },
  meshAccent: {
    position: 'absolute',
    top: 36,
    left: -56,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: palette.primaryLight,
    opacity: 0.5,
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
    borderColor: 'rgba(37, 99, 235, 0.14)',
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
  title: {
    flex: 1,
    zIndex: 1,
    letterSpacing: -0.6,
  },
  favoritesCta: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.brandBlueLight,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.16)',
  },
  subtitle: {
    zIndex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    maxWidth: '95%',
  },
  statusNote: {
    color: palette.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  lastKnownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.blueLight,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  lastKnownAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lastKnownActionLabel: {
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: layoutSpacing.screenHorizontal,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: palette.brandBlue,
    backgroundColor: palette.blueLight,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
