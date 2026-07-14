import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
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
import { articleRepository } from '@/domains/articles/repository';
import { profileRepository } from '@/domains/profile/repository';
import { providerRepository } from '@/domains/providers/repository';

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const countryCode = profileQuery.data?.countryCode ?? null;
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
    // Local SQLite read — do not block the shell on network.
    enabled: isGuest || profileQuery.isSuccess || profileQuery.isError,
  });

  const providersQuery = useQuery({
    queryKey: QUERY_KEYS.providers,
    queryFn: () => providerRepository.findAll(),
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

    // Only kick off Currents after we know guest/country context.
    if (isGuest || profileQuery.isFetched) {
      void refreshRemoteNews();
    }

    return () => {
      cancelled = true;
    };
  }, [countryCode, isGuest, profileQuery.isFetched, queryClient]);

  const articles = articlesQuery.data ?? [];
  const providers = providersQuery.data?.slice(0, 4) ?? [];

  return (
    <Box className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <HomeHeader firstName={firstName} />
        <OfflineBanner />
        <HomeSearchBar />
        <DailyHealthTip userKey={userKey} />
        <HealthCategoriesRow />
        <FeaturedArticles articles={articles} />
        <NearbyProvidersRow providers={providers} />
        <EmergencyBanner />
      </ScrollView>
    </Box>
  );
}
