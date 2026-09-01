import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Unlink } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrgCareTeamSection } from '@/components/connections/OrgCareTeamSection';
import { AppText } from '@/components/ui/AppText';
import { Button, FormField, Input } from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function ConnectedPayerDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const { connectionId: rawId } = useLocalSearchParams<{ connectionId?: string }>();
  const connectionId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState('');

  const query = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'detail', connectionId],
    queryFn: () => payerConnectionService.getConnectionById(connectionId),
    enabled: !isGuest && Boolean(connectionId),
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      payerConnectionService.disconnectConnection(connectionId, disconnectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setDisconnecting(false);
      setDisconnectReason('');
      Alert.alert(
        t('insurance.connections.disconnectSuccessTitle'),
        t('insurance.connections.disconnectSuccessMessage'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.disconnectFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
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
    return <LoadingState title={t('nearby.connections.payerDetailLoading')} />;
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

  const connection = query.data;
  if (!connection || connection.status !== 'approved') {
    return (
      <Screen>
        <AppText variant="sectionTitle">{t('nearby.connections.payerNotConnectedTitle')}</AppText>
        <AppText variant="body">{t('nearby.connections.payerNotConnectedMessage')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="sectionTitle">
            {connection.payerName ?? t('insurance.connections.payerFallback')}
          </AppText>
          <AppText variant="caption" style={styles.meta}>
            {t('nearby.connections.connectedSince', {
              date: new Date(connection.approvedAt ?? connection.createdAt).toLocaleDateString(),
            })}
          </AppText>
          <Button
            style={styles.linkButton}
            onPress={() =>
              router.push(`/(app)/profile/insurance/${connection.payerOrganizationId}` as Href)
            }
            variant="plain"
          >
            <AppText variant="body" style={styles.linkLabel}>
              {t('nearby.connections.viewOrgProfile')}
            </AppText>
          </Button>
        </View>

        <OrgCareTeamSection
          orgKind="payer"
          orgId={connection.payerOrganizationId}
          enabled
        />

        <View style={[styles.card, shadow.soft]}>
          <AppText variant="body" style={styles.disconnectHint}>
            {t('nearby.connections.payerDisconnectHint')}
          </AppText>
          {disconnecting ? (
            <>
              <FormField label={t('insurance.connections.disconnectReasonPlaceholder')}>
                <Input
                  value={disconnectReason}
                  onChangeText={setDisconnectReason}
                  placeholder={t('insurance.connections.disconnectReasonPlaceholder')}
                  multiline
                  editable={!disconnectMutation.isPending}
                  style={styles.reasonInput}
                />
              </FormField>
              <View style={styles.actions}>
                <Button
                  style={styles.secondary}
                  disabled={disconnectMutation.isPending}
                  onPress={() => {
                    setDisconnecting(false);
                    setDisconnectReason('');
                  }}
                  variant="plain"
                >
                  <AppText variant="button">{t('common.cancel')}</AppText>
                </Button>
                <Button
                  style={styles.danger}
                  loading={disconnectMutation.isPending}
                  onPress={() => disconnectMutation.mutate()}
                  variant="plain"
                >
                  <AppText variant="button" style={styles.dangerLabel}>
                    {t('insurance.connections.disconnectConfirmAction')}
                  </AppText>
                </Button>
              </View>
            </>
          ) : (
            <Button style={styles.dangerOutline} onPress={() => setDisconnecting(true)} variant="plain">
              <Unlink color={palette.danger} size={18} />
              <AppText variant="button" style={styles.dangerOutlineLabel}>
                {t('insurance.connections.disconnect')}
              </AppText>
            </Button>
          )}
        </View>
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
  meta: {
    color: palette.textSecondary,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  linkLabel: {
    color: palette.primary,
    fontWeight: '600',
  },
  disconnectHint: {
    color: palette.textSecondary,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    color: '#fff',
  },
  dangerOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  dangerOutlineLabel: {
    color: palette.danger,
  },
});
