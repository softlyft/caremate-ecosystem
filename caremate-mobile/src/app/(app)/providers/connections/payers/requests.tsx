import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FormActions, FormField, Input } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function PayerConnectionRequestsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const requestsQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'inbound'],
    queryFn: () => payerConnectionService.listInboundPending(),
    enabled: !isGuest,
  });

  const respondMutation = useMutation({
    mutationFn: (params: { connectionId: string; accept: boolean; rejectionReason?: string }) =>
      payerConnectionService.respondToRequest(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setDecliningId(null);
      setReason('');
      Alert.alert(
        variables.accept
          ? t('insurance.connections.approvedTitle')
          : t('insurance.connections.declinedTitle'),
        variables.accept
          ? t('insurance.connections.approvedMessage')
          : t('insurance.connections.declinedMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.respondFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
    },
    onSettled: () => {
      setBusyId(null);
    },
  });

  if (isGuest) {
    return (
      <Screen tone="surface">
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  if (requestsQuery.isLoading) {
    return <LoadingState title={t('nearby.connections.payerRequestsLoading')} />;
  }

  if (requestsQuery.isError && requestsQuery.data === undefined) {
    return (
      <ErrorState
        title={t('nearby.connections.loadFailed.title')}
        message={
          requestsQuery.error instanceof Error
            ? requestsQuery.error.message
            : t('nearby.connections.loadFailed.message')
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
    <Screen padded={false} tone="surface">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('nearby.connections.payerRequestsTitle')}</AppText>
        <AppText variant="subtitle">{t('nearby.connections.payerRequestsSubtitle')}</AppText>

        {requests.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="body">{t('insurance.connections.inboundEmpty')}</AppText>
          </View>
        ) : (
          requests.map((request) => {
            const busy = busyId === request.id;
            const declining = decliningId === request.id;
            return (
              <View key={request.id} style={[styles.card, shadow.soft]}>
                <AppText variant="body" style={styles.orgName}>
                  {request.payerName ?? t('insurance.connections.payerFallback')}
                </AppText>
                {request.payerNote ? (
                  <>
                    <AppText variant="caption" style={styles.noteLabel}>
                      {t('insurance.connections.noteLabel')}
                    </AppText>
                    <AppText variant="body">{request.payerNote}</AppText>
                  </>
                ) : null}

                {declining ? (
                  <View style={styles.reasonBlock}>
                    <FormField label={t('insurance.connections.reasonLabel')}>
                      <Input
                        value={reason}
                        onChangeText={setReason}
                        placeholder={t('insurance.connections.reasonPlaceholder')}
                        multiline
                        editable={!busy}
                        style={styles.reasonInput}
                      />
                    </FormField>
                    <FormActions style={styles.actions}>
                      <Button
                        style={styles.decline}
                        disabled={busy}
                        onPress={() => {
                          setDecliningId(null);
                          setReason('');
                        }}
                        variant="plain"
                      >
                        <AppText variant="button" style={styles.declineLabel}>
                          {t('common.cancel')}
                        </AppText>
                      </Button>
                      <Button
                        style={styles.approve}
                        loading={busy}
                        onPress={() => {
                          setBusyId(request.id);
                          respondMutation.mutate({
                            connectionId: request.id,
                            accept: false,
                            rejectionReason: reason,
                          });
                        }}
                        variant="plain"
                      >
                        <AppText variant="button" style={styles.approveLabel}>
                          {t('insurance.connections.confirmDecline')}
                        </AppText>
                      </Button>
                    </FormActions>
                  </View>
                ) : (
                  <FormActions style={styles.actions}>
                    <Button
                      style={styles.approve}
                      loading={busy}
                      onPress={() => {
                        setBusyId(request.id);
                        respondMutation.mutate({ connectionId: request.id, accept: true });
                      }}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.approveLabel}>
                        {t('insurance.connections.approveInbound')}
                      </AppText>
                    </Button>
                    <Button
                      style={styles.decline}
                      disabled={busy}
                      onPress={() => {
                        setDecliningId(request.id);
                        setReason('');
                      }}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.declineLabel}>
                        {t('insurance.connections.declineInbound')}
                      </AppText>
                    </Button>
                  </FormActions>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  orgName: {
    fontWeight: '600',
    fontSize: 16,
  },
  noteLabel: {
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  reasonBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: spacing.sm,
  },
  approve: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveLabel: {
    color: '#FFFFFF',
  },
  decline: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineLabel: {
    color: palette.text,
  },
});
