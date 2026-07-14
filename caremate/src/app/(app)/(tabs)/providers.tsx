import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Input } from '@/components/ui/form-controls';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { providerRepository } from '@/domains/providers/repository';
import {
  formatProviderType,
  PRIMARY_PROVIDER_TYPES,
  PROVIDER_TYPE_LABELS,
  type ProviderType,
} from '@/domains/providers/types';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const FILTERS: { label: string; value?: ProviderType }[] = [
  { label: 'All' },
  ...PRIMARY_PROVIDER_TYPES.map((type) => ({
    label: PROVIDER_TYPE_LABELS[type],
    value: type,
  })),
];

export default function ProvidersTabScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { q: queryParam } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(queryParam) ? (queryParam[0] ?? '') : (queryParam ?? '');
  const [filter, setFilter] = useState<ProviderType | undefined>();
  const [search, setSearch] = useState(initialQuery);
  const [queryParamSnapshot, setQueryParamSnapshot] = useState(queryParam);
  if (queryParam !== queryParamSnapshot) {
    setQueryParamSnapshot(queryParam);
    setSearch(initialQuery);
  }

  const providersQuery = useQuery({
    queryKey: [...QUERY_KEYS.providers, filter, search],
    queryFn: () =>
      providerRepository.findAll({
        type: filter,
        search: search.trim() || undefined,
      }),
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);

  if (providersQuery.isLoading) {
    return <LoadingState title="Loading providers..." />;
  }

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <OfflineBanner />
        <Input
          placeholder="Search providers"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const active = item.value === filter || (!item.value && !filter);
            return (
              <Pressable
                key={item.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFilter(item.value)}
              >
                <AppText variant="categoryPill" color={active ? 'inverse' : 'primary'}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable onPress={() => router.push('/(app)/providers/map')}>
        <AppText variant="seeAll">Open map view</AppText>
      </Pressable>
      {providers.length === 0 ? (
        <EmptyState
          title="No providers found"
          message="Try another search or filter, or refresh when online."
        />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/(app)/providers/${item.id}`)}
            >
              <AppText variant="providerName">{item.name}</AppText>
              <AppText variant="providerMeta">{formatProviderType(item.type)}</AppText>
              <AppText variant="providerMeta">
                {item.distanceKm ? `${item.distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
              </AppText>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  item: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
  },
});
