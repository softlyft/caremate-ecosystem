import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { Box } from '@/components/ui/box';
import { QUERY_KEYS } from '@/constants/config';
import { DailyHealthTip } from '@/features/home/components/DailyHealthTip';
import { EmergencyBanner } from '@/features/home/components/EmergencyBanner';
import { FeaturedArticles } from '@/features/home/components/FeaturedArticles';
import { HealthCategoriesRow } from '@/features/home/components/HealthCategoriesRow';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { HomeSearchBar } from '@/features/home/components/HomeSearchBar';
import { NearbyProvidersRow } from '@/features/home/components/NearbyProvidersRow';
import { splitFullName } from '@/domains/emergency/constants';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useDeviceDefaults } from '@/hooks/use-device-defaults';
import { articleRepository } from '@/domains/articles/repository';
import { profileRepository } from '@/domains/profile/repository';
import { resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { palette } from '@/theme';

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;
  const deviceDefaultsQuery = useDeviceDefaults();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const countryCode = isGuest
    ? (deviceDefaultsQuery.data?.countryCode ?? null)
    : (profileQuery.data?.countryCode ?? null);
  const firstName = isGuest
    ? null
    : splitFullName(profileQuery.data?.fullName ?? '').firstName || null;

  const articlesQuery = useQuery({
    queryKey: [...QUERY_KEYS.trendingArticles, userKey, countryCode ?? 'none'],
    queryFn: () =>
      articleRepository.getTrendingToday(3, {
        isGuest,
        countryCode,
        userKey,
      }),
    enabled: isGuest
      ? deviceDefaultsQuery.isFetched
      : profileQuery.isSuccess || profileQuery.isError,
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
          isGuest,
          countryCode,
        });
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
        }
      } catch {
        // Keep offline/local feed if Currents refresh fails.
      }
    }

    if ((isGuest && deviceDefaultsQuery.isFetched) || (!isGuest && profileQuery.isFetched)) {
      void refreshRemoteNews();
    }

    return () => {
      cancelled = true;
    };
  }, [countryCode, deviceDefaultsQuery.isFetched, isGuest, profileQuery.isFetched, queryClient]);

  const articles = articlesQuery.data ?? [];
  const providers = providersQuery.data?.slice(0, 4) ?? [];

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

        <AnimatedSection index={4}>
          <HealthCategoriesRow />
        </AnimatedSection>

        <FeaturedArticles articles={articles} />

        <AnimatedSection index={6}>
          <NearbyProvidersRow providers={providers} />
        </AnimatedSection>

        <AnimatedSection index={7}>
          <EmergencyBanner />
        </AnimatedSection>
      </Animated.ScrollView>
    </Box>
  );
}
