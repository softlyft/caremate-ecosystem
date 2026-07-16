import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { resolveNearbyCoords } from '@/domains/providers/location';
import { providerRepository } from '@/domains/providers/repository';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

export default function ProvidersMapScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const coordsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providers, 'coords'],
    queryFn: resolveNearbyCoords,
    staleTime: 5 * 60_000,
  });

  const query = useQuery({
    queryKey: [
      ...QUERY_KEYS.providers,
      'map',
      coordsQuery.data?.latitude,
      coordsQuery.data?.longitude,
    ],
    queryFn: async () => {
      const coords = coordsQuery.data ?? (await resolveNearbyCoords());
      return providerRepository.findNearby({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
    enabled: coordsQuery.isSuccess || coordsQuery.isError,
  });

  if (coordsQuery.isLoading || query.isLoading) {
    return <LoadingState title={t('nearby.map.loading')} />;
  }

  const providers = query.data?.providers ?? [];

  return (
    <Screen>
      <AppText variant="sectionTitle">{t('nearby.map.title')}</AppText>
      <AppText variant="caption">{t('nearby.map.subtitle')}</AppText>
      {providers.length === 0 ? (
        <EmptyState title={t('nearby.map.empty')} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <AppText variant="providerName">{item.name}</AppText>
              <AppText variant="providerMeta">
                {item.latitude ?? '—'}, {item.longitude ?? '—'}
                {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ''}
              </AppText>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
});
