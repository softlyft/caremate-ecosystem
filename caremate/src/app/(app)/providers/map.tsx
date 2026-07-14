import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { providerRepository } from '@/domains/providers/repository';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

export default function ProvidersMapScreen() {
  const { colors } = useAppTheme();

  const query = useQuery({
    queryKey: QUERY_KEYS.providers,
    queryFn: () => providerRepository.findAll(),
  });

  if (query.isLoading) {
    return <LoadingState title="Loading map data..." />;
  }

  const providers = query.data ?? [];

  return (
    <Screen>
      <AppText variant="sectionTitle">Nearby Providers</AppText>
      <AppText variant="caption">
        Native map integration can be added with `react-native-maps`. This screen lists cached
        provider coordinates for offline reference.
      </AppText>
      {providers.length === 0 ? (
        <EmptyState title="No providers to display" />
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
