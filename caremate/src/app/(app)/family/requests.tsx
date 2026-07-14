import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { familyConnectionService, familyRepository } from '@/domains/family';
import { profileRepository } from '@/domains/profile/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyRequests, userId],
    queryFn: async () => {
      await familyRepository.pullFromRemote(userId);
      return familyRepository.listIncomingRequests(userId);
    },
    enabled: !isGuest,
  });

  async function respond(requestId: string, accept: boolean) {
    setBusyId(requestId);
    try {
      const profile = await profileRepository.findByUserId(userId);
      await familyConnectionService.respondToRequest({
        requestId,
        userId,
        accept,
        selfFullName: profile?.fullName || profile?.email?.split('@')[0] || 'Spouse',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyRequests });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyHousehold });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
      Alert.alert(
        accept ? 'Connected' : 'Declined',
        accept
          ? 'You joined their household. Your personal CareMate data stays yours.'
          : 'Connection request declined.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update request';
      Alert.alert('Request failed', message);
    } finally {
      setBusyId(null);
    }
  }

  if (isGuest) {
    return (
      <View style={styles.padded}>
        <AppText variant="body">Sign in to view connection requests.</AppText>
      </View>
    );
  }

  if (requestsQuery.isLoading) {
    return <LoadingState title="Loading requests..." />;
  }

  const requests = requestsQuery.data ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <AppText variant="sectionTitle">Connection requests</AppText>
      <AppText variant="subtitle">
        Accepting joins their household for shared kids. Your profile and health data stay on your
        account.
      </AppText>

      {requests.length === 0 ? (
        <View style={styles.card}>
          <AppText variant="body">No pending requests.</AppText>
        </View>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <AppText variant="cardTitle">Spouse connection</AppText>
            <AppText variant="caption" style={styles.muted}>
              From user {request.fromUserId.slice(0, 8)}…
            </AppText>
            {request.toEmail ? (
              <AppText variant="caption">Lookup email: {request.toEmail}</AppText>
            ) : null}
            {request.toPhone ? (
              <AppText variant="caption">Lookup phone: {request.toPhone}</AppText>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={busyId === request.id ? 'Working...' : 'Accept'}
                disabled={busyId === request.id}
                onPress={() => respond(request.id, true)}
              />
              <Button
                label="Decline"
                variant="secondary"
                disabled={busyId === request.id}
                onPress={() => respond(request.id, false)}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  padded: {
    flex: 1,
    padding: layoutSpacing.screenHorizontal,
    justifyContent: 'center',
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  muted: {
    color: palette.textSecondary,
  },
});
