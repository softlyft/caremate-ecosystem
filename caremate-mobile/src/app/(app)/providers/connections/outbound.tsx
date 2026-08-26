import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

export default function ProviderOutboundConnectionRequestsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const requestsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'outbound'],
    queryFn: () => providerConnectionService.listOutboundPending(),
    enabled: !isGuest,
  });

  const cancelMutation = useMutation({
    mutationFn: (params: { connectionId: string; reason: string }) =>
      providerConnectionService.cancelPendingRequest(params.connectionId, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      setCancellingId(null);
      setReason('');
      Alert.alert(
        t('nearby.detail.cancelSuccessTitle'),
        t('nearby.detail.cancelSuccessMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.detail.cancelFailedTitle'),
        error instanceof Error ? error.message : t('nearby.connectionRequests.failedMessage'),
      );
    },
    onSettled: () => {
      setBusyId(null);
    },
  });

  if (isGuest) {
    return (
      <View style={styles.padded}>
        <AppText variant="body">{t('nearby.connectionRequests.guest')}</AppText>
      </View>
    );
  }

  if (requestsQuery.isLoading) {
    return <LoadingState title={t('nearby.connectionRequests.loading')} />;
  }

  if (requestsQuery.isError && requestsQuery.data === undefined) {
    return (
      <ErrorState
        title={t('nearby.connectionRequests.loadFailed.title')}
        message={
          requestsQuery.error instanceof Error
            ? requestsQuery.error.message
            : t('nearby.connectionRequests.loadFailed.message')
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <AppText variant="sectionTitle">{t('nearby.connections.outboundScreenTitle')}</AppText>
      <AppText variant="subtitle">{t('nearby.connections.outboundScreenSubtitle')}</AppText>

      {requests.length === 0 ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="body">{t('nearby.connections.outboundEmpty')}</AppText>
        </View>
      ) : (
        requests.map((request) => {
          const busy = busyId === request.id;
          const cancelling = cancellingId === request.id;
          return (
            <View key={request.id} style={[styles.card, shadow.soft]}>
              <AppText variant="body" style={styles.orgName}>
                {request.organizationName ?? t('nearby.connectionRequests.providerFallback')}
              </AppText>
              <AppText variant="caption" style={styles.statusLabel}>
                {t('nearby.connections.outboundPendingLabel')}
              </AppText>
              {request.patientNote ? (
                <>
                  <AppText variant="caption" style={styles.noteLabel}>
                    {t('nearby.connectionRequests.noteLabel')}
                  </AppText>
                  <AppText variant="body">{request.patientNote}</AppText>
                </>
              ) : null}

              {cancelling ? (
                <View style={styles.reasonBlock}>
                  <AppText variant="caption" style={styles.noteLabel}>
                    {t('nearby.detail.cancelReasonLabel')}
                  </AppText>
                  <TextInput
                    style={styles.reasonInput}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={t('nearby.detail.cancelReasonPlaceholder')}
                    placeholderTextColor={textColors.placeholder}
                    multiline
                    editable={!busy}
                  />
                  <View style={styles.actions}>
                    <Button
                      style={styles.decline}
                      disabled={busy}
                      onPress={() => {
                        setCancellingId(null);
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
                        cancelMutation.mutate({ connectionId: request.id, reason });
                      }}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.approveLabel}>
                        {t('nearby.detail.confirmCancelRequest')}
                      </AppText>
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Button
                    style={styles.decline}
                    disabled={busy}
                    onPress={() => {
                      setCancellingId(request.id);
                      setReason('');
                    }}
                    variant="plain"
                  >
                    <AppText variant="button" style={styles.declineLabel}>
                      {t('nearby.detail.cancelRequest')}
                    </AppText>
                  </Button>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  padded: {
    flex: 1,
    padding: layoutSpacing.screenHorizontal,
    justifyContent: 'center',
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
  statusLabel: {
    color: palette.textSecondary,
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
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    padding: 12,
    color: palette.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
