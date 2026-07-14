import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Linking } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { Card, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { providerRepository } from '@/domains/providers/repository';
import { formatProviderType } from '@/domains/providers/types';

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.providers, id],
    queryFn: () => providerRepository.findById(id),
    enabled: Boolean(id),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => providerRepository.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providers });
      query.refetch();
    },
  });

  if (query.isLoading) {
    return <LoadingState title="Loading provider..." />;
  }

  if (!query.data) {
    return <ErrorState title="Provider not found" />;
  }

  const provider = query.data;

  function openDirections() {
    if (!provider.latitude || !provider.longitude) {
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`;
    Linking.openURL(url);
  }

  return (
    <Screen>
      <Card>
        <AppText variant="screenTitle">{provider.name}</AppText>
        <AppText variant="providerMeta">{formatProviderType(provider.type)}</AppText>
        <AppText variant="body">{provider.address ?? 'Address unavailable'}</AppText>
        <AppText variant="body">{provider.phone ?? 'Phone unavailable'}</AppText>
        <AppText variant="body">{provider.email ?? 'Email unavailable'}</AppText>
      </Card>
      <Button
        label={provider.isFavorite ? 'Remove Favorite' : 'Add Favorite'}
        variant="secondary"
        onPress={() => favoriteMutation.mutate()}
      />
      <Button label="Get Directions" onPress={openDirections} />
      <Button label="Back to List" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
