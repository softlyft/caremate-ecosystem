import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { Box } from '@/components/ui/box';
import { ErrorState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { AdSlot } from '@/features/ads/AdSlot';
import { DailyHealthTip } from '@/features/home/components/DailyHealthTip';
import { EmergencyBanner } from '@/features/home/components/EmergencyBanner';
import { FeaturedArticles } from '@/features/home/components/FeaturedArticles';
import { HealthCategoriesRow } from '@/features/home/components/HealthCategoriesRow';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeSearchBar } from '@/features/home/components/HomeSearchBar';
import { NearbyProvidersRow } from '@/features/home/components/NearbyProvidersRow';
import { splitFullName } from '@/domains/emergency/constants';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';
import { articleRepository } from '@/domains/articles/repository';
import { HOME_TRENDING_MAX_ITEMS } from '@/domains/articles/utils/evergreen-articles';
import { profileRepository } from '@/domains/profile/repository';
import { resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { layoutSpacing, palette } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;
  const { countryCode, languageCode, isReady: localizationReady } = useLocalizationPreferences();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const firstName = isGuest
    ? null
    : splitFullName(profileQuery.data?.fullName ?? '').firstName || null;

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
  });

  const coordsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providers, 'coords'],
    queryFn: resolveNearbyCoords,
    staleTime: 5 * 60_000,
  });

  const providersQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.providers,
      'nearby-home',
      coordsQuery.data?.latitude,
      coordsQuery.data?.longitude,
    ],
    queryFn: async () => {
      const coords = coordsQuery.data ?? (await resolveNearbyCoords());
      const result = await providerRepository.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
        limit: 8,
      });
      return result.providers;
    },
    enabled: coordsQuery.isSuccess || coordsQuery.isError,
  });

  useEffect(() => {
    let cancelled = false;

    async function refreshRemoteNews() {
      try {
        await articleRepository.refreshTrendingInBackground({
          countryCode,
          languageCode,
        });
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
        }
      } catch {
        // Keep offline/local feed if Currents refresh fails.
      }
    }

    if (localizationReady) {
      void refreshRemoteNews();
    }

    return () => {
      cancelled = true;
    };
  }, [countryCode, languageCode, localizationReady, queryClient]);

  const articles = articlesQuery.data ?? [];
  const providers = providersQuery.data?.slice(0, 4) ?? [];
  const feedFailed = localizationReady && articlesQuery.isError && articlesQuery.data === undefined;

  if (feedFailed) {
    return (
      <Box className="flex-1" style={{ backgroundColor: palette.surface }}>
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
      </Box>
    );
  }

  return (
    <Box className="flex-1" style={{ backgroundColor: palette.surface }}>
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
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

        <AnimatedSection
          index={4}
          style={{
            marginHorizontal: layoutSpacing.screenHorizontal,
            marginBottom: layoutSpacing.sectionTitleToContent,
          }}
        >
          <AdSlot slotId={AD_SLOTS.HOME_TIPS} />
        </AnimatedSection>

        <AnimatedSection index={5}>
          <HealthCategoriesRow />
        </AnimatedSection>

        <FeaturedArticles articles={articles} />

        <AnimatedSection
          index={6}
          style={{
            marginHorizontal: layoutSpacing.screenHorizontal,
            marginBottom: layoutSpacing.sectionTitleToContent,
          }}
        >
          <AdSlot slotId={AD_SLOTS.HOME_FEED} />
        </AnimatedSection>

        <AnimatedSection index={7}>
          <NearbyProvidersRow providers={providers} />
        </AnimatedSection>

        <AnimatedSection index={8}>
          <EmergencyBanner />
        </AnimatedSection>
      </Animated.ScrollView>
    </Box>
  );
}
