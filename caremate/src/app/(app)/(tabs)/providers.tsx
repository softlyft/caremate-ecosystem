import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPinned, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { useTranslation } from '@/domains/localization';
import {
  NearbyProviderCard,
  getProviderTypeTheme,
} from '@/domains/providers/components/NearbyProviderCard';
import { resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { PRIMARY_PROVIDER_TYPES, type ProviderType } from '@/domains/providers/types';
import { AdSlot } from '@/features/ads/AdSlot';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function ProvidersTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { online } = useNetworkStatus();
  const { q: queryParam } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(queryParam) ? (queryParam[0] ?? '') : (queryParam ?? '');
  const [filter, setFilter] = useState<ProviderType | undefined>();
  const [search, setSearch] = useState(initialQuery);
  const [queryParamSnapshot, setQueryParamSnapshot] = useState(queryParam);
  if (queryParam !== queryParamSnapshot) {
    setQueryParamSnapshot(queryParam);
    setSearch(initialQuery);
  }

  const filters = useMemo(
    () => [
      { label: t('common.all'), value: undefined as ProviderType | undefined },
      ...PRIMARY_PROVIDER_TYPES.map((type) => ({
        label: t(`home.providerTypes.${type}`),
        value: type as ProviderType,
      })),
    ],
    [t],
  );

  const coordsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providers, 'coords'],
    queryFn: resolveNearbyCoords,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const providersQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.providers,
      'nearby',
      filter,
      search,
      coordsQuery.data?.latitude,
      coordsQuery.data?.longitude,
    ],
    queryFn: async () => {
      const coords = coordsQuery.data ?? (await resolveNearbyCoords());
      return providerRepository.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        type: filter,
        search: search.trim() || undefined,
      });
    },
    enabled: coordsQuery.isSuccess || coordsQuery.isError,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const providers = useMemo(() => providersQuery.data?.providers ?? [], [providersQuery.data]);
  const source = providersQuery.data?.source;
  const approximateLocation = coordsQuery.data?.isApproximate ?? true;

  if (
    (coordsQuery.isLoading || providersQuery.isLoading) &&
    providersQuery.data === undefined &&
    coordsQuery.data === undefined
  ) {
    return (
      <View style={styles.screen}>
        <LoadingState title={t('nearby.loading')} />
      </View>
    );
  }

  if (providersQuery.isError && providersQuery.data === undefined) {
    return (
      <View style={styles.screen}>
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
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={providers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.sm },
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
                    {t('nearby.nearbyCount', { count: providers.length })}
                  </AppText>
                </View>
                <AppText variant="screenTitle" style={styles.title}>
                  {t('nearby.title')}
                </AppText>
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
            {online && source === 'remote' && approximateLocation ? (
              <AppText variant="caption" style={styles.statusNote}>
                {t('nearby.approximate')}
              </AppText>
            ) : null}

            <View style={[styles.searchShell, shadow.soft]}>
              <View style={styles.searchIcon}>
                <Search color={palette.primary} size={16} strokeWidth={2.5} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t('nearby.searchPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              decelerationRate="fast"
            >
              {filters.map((item) => {
                const active = item.value === filter || (!item.value && !filter);
                const theme = item.value ? getProviderTypeTheme(item.value) : null;
                const Icon = theme?.icon ?? MapPinned;
                const iconBg = theme?.soft ?? palette.blueLight;
                const iconColor = theme?.accent ?? palette.brandBlue;

                return (
                  <PressableScale
                    key={item.value ?? 'all'}
                    style={[
                      styles.chip,
                      active ? styles.chipSelected : null,
                      active && theme
                        ? {
                            borderColor: theme.accent,
                            backgroundColor: theme.soft,
                          }
                        : null,
                      shadow.soft,
                    ]}
                    onPress={() => setFilter(item.value)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                      <Icon color={iconColor} size={15} strokeWidth={2.25} />
                    </View>
                    <AppText variant="categoryPill">{item.label}</AppText>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <AdSlot slotId={AD_SLOTS.NEARBY_LIST} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('nearby.empty.title')}
            message={online ? t('nearby.empty.message') : t('nearby.empty.offline')}
          />
        }
        renderItem={({ item }) => (
          <NearbyProviderCard
            provider={item}
            onPress={() => router.push(`/(app)/providers/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
  title: {
    zIndex: 1,
    letterSpacing: -0.6,
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
