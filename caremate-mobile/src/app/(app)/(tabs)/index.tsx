import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { TabScrollView, iosTabScrollProps } from '@/components/navigation/tab-scroll';

import { applyAppStateChange, createAppBackgroundGate } from '@/sync/app-state';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { Screen, ErrorState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { AdSlot } from '@/features/ads/AdSlot';
import { DailyHealthTip } from '@/features/home/components/DailyHealthTip';
import { EmergencyBanner } from '@/features/home/components/EmergencyBanner';
import { FeaturedArticles } from '@/features/home/components/FeaturedArticles';
import { HealthCategoriesRow } from '@/features/home/components/HealthCategoriesRow';
import { HealthTimelineCard } from '@/features/home/components/HealthTimelineCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeSearchBar } from '@/features/home/components/HomeSearchBar';
import { NearbyProvidersRow } from '@/features/home/components/NearbyProvidersRow';
import { useTranslation } from '@/domains/localization';
import { useAccountDisplayName } from '@/hooks/use-account-display-name';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';
import { articleRepository } from '@/domains/articles/repository';
import { HOME_TRENDING_MAX_ITEMS } from '@/domains/articles/utils/evergreen-articles';
import { enableNearbyLocationAccess, resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { layoutSpacing } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;
  const { countryCode, languageCode, isReady: localizationReady } = useLocalizationPreferences();
  const { firstName } = useAccountDisplayName();

  const articlesQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.trendingArticles,
      userKey,
      countryCode ?? 'none',
      languageCode ?? 'en',
    ],
    queryFn: () =>
      articleRepository.getTrendingToday(HOME_TRENDING_MAX_ITEMS, {
        isGuest,
        countryCode,
        userKey,
      }),
    enabled: localizationReady,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

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
      'nearby-home',
      coordsQuery.data?.latitude,
      coordsQuery.data?.longitude,
      coordsQuery.data?.precision,
    ],
    queryFn: async () => {
      const coords = coordsQuery.data ?? (await resolveNearbyCoords());
      if (coords.latitude == null || coords.longitude == null) {
        // No usable location — fall back to whatever providers are cached locally.
        const cached = await providerRepository.findAll();
        return cached.slice(0, 8);
      }
      const result = await providerRepository.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        limit: 8,
      });
      return result.providers;
    },
    enabled: coordsQuery.isSuccess || coordsQuery.isError,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-subscribe if refetch identity changes
  }, [coordsQuery.refetch]);

  useEffect(() => {
    let cancelled = false;
    let interactionTask: { cancel: () => void } | null = null;

    async function refreshCatalog() {
      try {
        await articleRepository.pullFromRemote();
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
        }
      } catch {
        // Keep offline/local feed if catalog pull fails.
      }
    }

    if (localizationReady) {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        void refreshCatalog();
      });
    }

    return () => {
      cancelled = true;
      interactionTask?.cancel();
    };
  }, [localizationReady, queryClient]);

  const articles = articlesQuery.data ?? [];
  const providers = providersQuery.data?.slice(0, 4) ?? [];
  const nearbyLocationNeeded =
    coordsQuery.data?.precision === 'none' && !providersQuery.isLoading && providers.length === 0;
  const locationPermissionBlocked = Boolean(coordsQuery.data?.permissionBlocked);
  const feedFailed = localizationReady && articlesQuery.isError && articlesQuery.data === undefined;

  if (feedFailed) {
    return (
      <Screen padded={false}>
        <ErrorState
          title={t('home.loadFailed.title')}
          message={
            articlesQuery.error instanceof Error
              ? articlesQuery.error.message
              : t('home.loadFailed.message')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void articlesQuery.refetch();
            void providersQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TabScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        {...iosTabScrollProps}
      >
        <AnimatedSection index={0}>
          <HomeHeader firstName={firstName} />
        </AnimatedSection>

        <AnimatedSection index={1}>
          <OfflineBanner />
        </AnimatedSection>

        <AnimatedSection index={2}>
          <HomeSearchBar />
        </AnimatedSection>

        <AnimatedSection index={3}>
          <DailyHealthTip userKey={userKey} />
        </AnimatedSection>

        <AnimatedSection index={4}>
          <HealthTimelineCard />
        </AnimatedSection>

        <AnimatedSection
          index={5}
          style={{
            marginHorizontal: layoutSpacing.screenHorizontal,
            marginBottom: layoutSpacing.sectionTitleToContent,
          }}
        >
          <AdSlot slotId={AD_SLOTS.HOME_TIPS} />
        </AnimatedSection>

        <AnimatedSection index={6}>
          <HealthCategoriesRow />
        </AnimatedSection>

        <FeaturedArticles articles={articles} />

        <AnimatedSection
          index={7}
          style={{
            marginHorizontal: layoutSpacing.screenHorizontal,
            marginBottom: layoutSpacing.sectionTitleToContent,
          }}
        >
          <AdSlot slotId={AD_SLOTS.HOME_FEED} />
        </AnimatedSection>

        <AnimatedSection index={8}>
          <NearbyProvidersRow
            providers={providers}
            locationNeeded={nearbyLocationNeeded}
            permissionBlocked={locationPermissionBlocked}
            onEnableLocation={() => {
              void handleEnableLocation();
            }}
            enablePending={locationRequestPending}
          />
        </AnimatedSection>

        <AnimatedSection index={9}>
          <EmergencyBanner />
        </AnimatedSection>
      </TabScrollView>
    </Screen>
  );
}
