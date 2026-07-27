import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { NearbyProviderCard } from '@/domains/providers/components/NearbyProviderCard';
import { providerRepository } from '@/domains/providers/repository';
import { spacing } from '@/theme';

export default function ProviderFavoritesScreen() {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: QUERY_KEYS.providerFavorites,
    queryFn: () => providerRepository.listFavorites(),
  });
  const { refetch } = query;

  // Refetch when returning from provider detail so unfavorite/favorite is visible immediately.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (query.isLoading && query.data === undefined) {
    return <LoadingState title={t('nearby.favorites.loading')} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={t('nearby.favorites.loadFailed.title')}
        message={
          query.error instanceof Error
            ? query.error.message
            : t('nearby.favorites.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => void query.refetch()}
      />
    );
  }

  const favorites = query.data ?? [];

  return (
    <Screen>
      {favorites.length === 0 ? (
        <EmptyState
          title={t('nearby.favorites.emptyTitle')}
          message={t('nearby.favorites.emptyMessage')}
          actionLabel={t('nearby.favorites.emptyAction')}
          onAction={() => router.replace('/(app)/(tabs)/providers')}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NearbyProviderCard
              provider={item}
              onPress={() => router.push(`/(app)/providers/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 12,
  },
});
