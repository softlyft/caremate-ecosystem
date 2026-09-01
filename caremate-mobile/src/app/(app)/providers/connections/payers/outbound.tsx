import { router, type Href } from 'expo-router';
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

export default function PayerOutboundRequestsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'outbound'],
    queryFn: () => payerConnectionService.listOutboundPending(),
    enabled: !isGuest,
  });

  const cancelMutation = useMutation({
    mutationFn: (params: { connectionId: string; reason: string }) =>
      payerConnectionService.cancelPendingRequest(params.connectionId, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setCancellingId(null);
      setCancelReason('');
      Alert.alert(
        t('insurance.connections.cancelSuccessTitle'),
        t('insurance.connections.cancelSuccessMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.cancelFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
    },
    onSettled: () => {
      setBusyId(null);
    },
  });

  if (isGuest) {
    return (
      <Screen>
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  if (query.isLoading) {
    return <LoadingState title={t('nearby.connections.payerOutboundLoading')} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={t('nearby.connections.loadFailed.title')}
        message={
          query.error instanceof Error
            ? query.error.message
            : t('nearby.connections.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const outbound = query.data ?? [];

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('nearby.connections.payerOutboundScreenTitle')}</AppText>
        <AppText variant="subtitle">{t('nearby.connections.payerOutboundScreenSubtitle')}</AppText>

        {outbound.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="body">{t('nearby.connections.payerOutboundEmpty')}</AppText>
          </View>
        ) : (
          outbound.map((item) => {
            const cancelling = cancellingId === item.id;
            const busy = busyId === item.id;
            return (
              <View key={item.id} style={[styles.card, shadow.soft]}>
                <AppText variant="body" style={styles.orgName}>
                  {item.payerName ?? t('insurance.connections.payerFallback')}
                </AppText>
                <AppText variant="caption" style={styles.meta}>
                  {t('nearby.connections.outboundPendingLabel')}
                </AppText>

                {cancelling ? (
                  <>
                    <FormField label={t('insurance.connections.cancelReasonLabel')}>
                      <Input
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        placeholder={t('insurance.connections.cancelReasonPlaceholder')}
                        multiline
                        editable={!busy}
                        style={styles.reasonInput}
                      />
                    </FormField>
                    <FormActions style={styles.actions}>
                      <Button
                        style={styles.secondary}
                        disabled={busy}
                        onPress={() => {
                          setCancellingId(null);
                          setCancelReason('');
                        }}
                        variant="plain"
                      >
                        <AppText variant="button">{t('common.cancel')}</AppText>
                      </Button>
                      <Button
                        style={styles.primary}
                        loading={busy}
                        onPress={() => {
                          setBusyId(item.id);
                          cancelMutation.mutate({ connectionId: item.id, reason: cancelReason });
                        }}
                        variant="plain"
                      >
                        <AppText variant="button" style={styles.primaryLabel}>
                          {t('insurance.connections.confirmCancelRequest')}
                        </AppText>
                      </Button>
                    </FormActions>
                  </>
                ) : (
                  <Button
                    style={styles.secondary}
                    onPress={() => {
                      setCancellingId(item.id);
                      setCancelReason('');
                    }}
                    variant="plain"
                  >
                    <AppText variant="button">{t('insurance.connections.cancelRequest')}</AppText>
                  </Button>
                )}

                <Button
                  style={styles.link}
                  onPress={() => router.push(`/(app)/profile/insurance/${item.payerOrganizationId}` as Href)}
                  variant="plain"
                >
                  <AppText variant="caption" style={styles.linkLabel}>
                    {t('nearby.connections.viewOrg')}
                  </AppText>
                </Button>
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
  meta: {
    color: palette.textSecondary,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: spacing.xs,
  },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#fff',
  },
  secondary: {
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: 0,
  },
  linkLabel: {
    color: palette.primary,
    fontWeight: '600',
  },
});
