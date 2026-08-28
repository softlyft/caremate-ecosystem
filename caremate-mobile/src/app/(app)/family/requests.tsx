import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, FormActions } from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { familyConnectionService, familyRepository } from '@/domains/family';
import { useTranslation } from '@/domains/localization';
import { profileRepository } from '@/domains/profile/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilyRequestsScreen() {
  const { t } = useTranslation();
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
        selfFullName:
          profile?.fullName || profile?.email?.split('@')[0] || t('family.defaultSpouseName'),
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyRequests });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyHousehold });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
      Alert.alert(
        accept ? t('family.requests.connected') : t('family.requests.declined'),
        accept ? t('family.requests.connectedMessage') : t('family.requests.declinedMessage'),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.requests.failedMessage');
      Alert.alert(t('family.requests.failed'), message);
    } finally {
      setBusyId(null);
    }
  }

  if (isGuest) {
    return (
      <Screen tone="background">
        <AppText variant="body">{t('family.requests.guest')}</AppText>
      </Screen>
    );
  }

  if (requestsQuery.isLoading) {
    return <LoadingState title={t('family.requests.loading')} />;
  }

  if (requestsQuery.isError && requestsQuery.data === undefined) {
    return (
      <ErrorState
        title={t('family.requests.loadFailed.title')}
        message={
          requestsQuery.error instanceof Error
            ? requestsQuery.error.message
            : t('family.requests.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void requestsQuery.refetch();
        }}
      />
    );
  }

  const requests = requestsQuery.data ?? [];

  return (
    <Screen padded={false} tone="background">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('family.requests.title')}</AppText>
        <AppText variant="subtitle">{t('family.requests.subtitle')}</AppText>

        {requests.length === 0 ? (
          <View style={styles.card}>
            <AppText variant="body">{t('family.requests.empty')}</AppText>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.card}>
              <AppText variant="cardTitle">{t('family.requests.spouseConnection')}</AppText>
              <AppText variant="caption" style={styles.muted}>
                {t('family.requests.fromUser', { id: request.fromUserId.slice(0, 8) })}
              </AppText>
              {request.toEmail ? (
                <AppText variant="caption">
                  {t('family.requests.lookupEmail', { email: request.toEmail })}
                </AppText>
              ) : null}
              {request.toPhone ? (
                <AppText variant="caption">
                  {t('family.requests.lookupPhone', { phone: request.toPhone })}
                </AppText>
              ) : null}
              <FormActions style={styles.actions}>
                <Button
                  label={
                    busyId === request.id
                      ? t('family.requests.working')
                      : t('family.requests.accept')
                  }
                  disabled={busyId === request.id}
                  onPress={() => respond(request.id, true)}
                />
                <Button
                  label={t('family.requests.decline')}
                  variant="secondary"
                  disabled={busyId === request.id}
                  onPress={() => respond(request.id, false)}
                />
              </FormActions>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
