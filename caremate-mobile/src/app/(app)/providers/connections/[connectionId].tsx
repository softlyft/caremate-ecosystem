import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldPlus, Unlink } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { OrgCareTeamSection } from '@/components/connections/OrgCareTeamSection';
import { Button, ChoiceChip, FormField, Input } from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { addCalendarDays, isDateKey, todayDateKey } from '@/domains/timeline/consent-window';
import {
  listAvailableConsents,
  listGrantedConsents,
  resolveConsentDescription,
  resolveConsentTitle,
  type ConnectionConsentDefinition,
} from '@/domains/providers/connection-consents';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { TimelineDatePicker } from '@/features/timeline/TimelineDatePicker';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function ConnectedProviderDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const { connectionId: rawId } = useLocalSearchParams<{ connectionId?: string }>();
  const connectionId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const [pickingConsent, setPickingConsent] = useState(false);
  const [rangeConsent, setRangeConsent] = useState<ConnectionConsentDefinition | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [rangePreset, setRangePreset] = useState<30 | 90 | 180 | 'custom' | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState('');

  const query = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'detail', connectionId],
    queryFn: () => providerConnectionService.getConnectionById(connectionId),
    enabled: !isGuest && Boolean(connectionId),
  });

  const consentsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'consents', connectionId],
    queryFn: () => providerConnectionService.listConsents(connectionId),
    enabled: !isGuest && Boolean(connectionId) && Boolean(query.data),
  });

  const definitionsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.providerConnections,
      'consent-definitions',
      query.data?.organizationId ?? 'system',
    ],
    queryFn: () =>
      providerConnectionService.listConsentDefinitions(query.data?.organizationId ?? null),
    enabled: !isGuest && Boolean(query.data?.organizationId),
  });

  const consentMutation = useMutation({
    mutationFn: (params: {
      scope: string;
      granted: boolean;
      definitionId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) =>
      providerConnectionService.setConsent({
        connectionId,
        scope: params.scope,
        granted: params.granted,
        definitionId: params.definitionId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      setPickingConsent(false);
      setRangeConsent(null);
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.connections.consentFailedTitle'),
        error instanceof Error ? error.message : t('nearby.connections.consentFailedMessage'),
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      providerConnectionService.disconnectConnection(connectionId, disconnectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      setDisconnecting(false);
      setDisconnectReason('');
      Alert.alert(
        t('nearby.connections.disconnectSuccessTitle'),
        t('nearby.connections.disconnectSuccessMessage'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.connections.disconnectFailedTitle'),
        error instanceof Error ? error.message : t('nearby.connectionRequests.failedMessage'),
      );
    },
  });

  if (isGuest) {
    return (
      <Screen tone="surface">
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  if (!connectionId) {
    return (
      <ErrorState
        title={t('nearby.connections.loadFailed.title')}
        message={t('nearby.connections.loadFailed.message')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  if (query.isLoading || (query.data && definitionsQuery.isLoading)) {
    return <LoadingState title={t('nearby.connections.detailLoading')} />;
  }

  if (query.isError || !query.data) {
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
  if (connection.status !== 'approved') {
    return (
      <ErrorState
        title={t('nearby.connections.detailNotConnectedTitle')}
        message={t('nearby.connections.detailNotConnectedMessage')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const orgName = connection.organizationName ?? t('nearby.connectionRequests.providerFallback');
  const definitions = definitionsQuery.data ?? [];
  const available = listAvailableConsents(connection.sharedScopes, definitions);
  const granted = listGrantedConsents(connection.sharedScopes, definitions);
  const busy = consentMutation.isPending || disconnectMutation.isPending;

  const confirmGrant = (consent: ConnectionConsentDefinition) => {
    if (consent.scope === 'health_timeline') {
      const end = todayDateKey();
      setRangeConsent(consent);
      setRangePreset(90);
      setPeriodEnd(end);
      setPeriodStart(addCalendarDays(end, -89));
      setPickingConsent(false);
      return;
    }
    const title = resolveConsentTitle(consent, t);
    Alert.alert(
      t('nearby.connections.grantConfirmTitle'),
      t('nearby.connections.grantConfirmMessage', { consent: title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('nearby.connections.grantConfirmAction'),
          onPress: () =>
            consentMutation.mutate({
              scope: consent.scope,
              granted: true,
              definitionId: consent.definitionId,
            }),
        },
      ],
    );
  };

  const confirmRevoke = (consent: ConnectionConsentDefinition) => {
    const title = resolveConsentTitle(consent, t);
    Alert.alert(
      t('nearby.connections.revokeConfirmTitle'),
      t('nearby.connections.revokeConfirmMessage', { consent: title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('nearby.connections.revokeConfirmAction'),
          style: 'destructive',
          onPress: () =>
            consentMutation.mutate({
              scope: consent.scope,
              granted: false,
              definitionId: consent.definitionId,
            }),
        },
      ],
    );
  };

  return (
    <Screen padded={false} tone="surface">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="sectionTitle">{orgName}</AppText>
          <AppText variant="caption" style={styles.meta}>
            {t('nearby.connections.connectedSince', {
              date: new Date(connection.approvedAt ?? connection.createdAt).toLocaleDateString(),
            })}
          </AppText>
          {connection.providerNote ? (
            <AppText variant="body" style={styles.note}>
              {connection.providerNote}
            </AppText>
          ) : null}
        </View>

        <OrgCareTeamSection orgKind="provider" orgId={connection.organizationId} enabled />

        <View style={[styles.card, shadow.soft]}>
          <View style={styles.sectionHeader}>
            <ShieldPlus size={20} color={palette.primary} />
            <AppText variant="body" style={styles.sectionTitle}>
              {t('nearby.connections.consentSectionTitle')}
            </AppText>
          </View>
          <AppText variant="subtitle">{t('nearby.connections.consentSectionSubtitle')}</AppText>

          {granted.length > 0 ? (
            <View style={styles.list}>
              <AppText variant="caption" style={styles.listLabel}>
                {t('nearby.connections.grantedLabel')}
              </AppText>
              {granted.map((consent) => {
                const title = resolveConsentTitle(consent, t);
                const description = resolveConsentDescription(consent, t);
                return (
                  <View key={consent.definitionId ?? consent.scope} style={styles.consentRow}>
                    <View style={styles.consentCopy}>
                      <AppText variant="body" style={styles.consentTitle}>
                        {title}
                      </AppText>
                      {description ? (
                        <AppText variant="caption" style={styles.meta}>
                          {description}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" style={styles.grantedBadge}>
                        {t('nearby.connections.grantedBadge')}
                      </AppText>
                      {consent.scope === 'health_timeline'
                        ? (() => {
                            const grant = (consentsQuery.data ?? []).find(
                              (row) =>
                                row.definitionId === consent.definitionId ||
                                row.code === 'health_timeline',
                            );
                            if (!grant?.periodStart || !grant.periodEnd) {
                              return null;
                            }
                            return (
                              <AppText variant="caption" style={styles.meta}>
                                {t('nearby.connections.timelineWindow', {
                                  from: grant.periodStart,
                                  to: grant.periodEnd,
                                })}
                              </AppText>
                            );
                          })()
                        : null}
                    </View>
                    <Button
                      label={t('nearby.connections.removeConsent')}
                      variant="secondary"
                      onPress={() => confirmRevoke(consent)}
                      disabled={busy}
                      loading={busy}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <AppText variant="body" style={styles.emptyConsent}>
              {t('nearby.connections.noGrantedConsent')}
            </AppText>
          )}

          {pickingConsent ? (
            <View style={styles.list}>
              <AppText variant="caption" style={styles.listLabel}>
                {t('nearby.connections.availableLabel')}
              </AppText>
              {available.length === 0 ? (
                <AppText variant="body">{t('nearby.connections.noAvailableConsent')}</AppText>
              ) : (
                available.map((consent) => {
                  const title = resolveConsentTitle(consent, t);
                  const description = resolveConsentDescription(consent, t);
                  return (
                    <Pressable
                      key={consent.definitionId ?? consent.scope}
                      style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}
                      onPress={() => confirmGrant(consent)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={title}
                    >
                      <AppText variant="body" style={styles.consentTitle}>
                        {title}
                      </AppText>
                      {description ? (
                        <AppText variant="caption" style={styles.meta}>
                          {description}
                        </AppText>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setPickingConsent(false)}
                disabled={busy}
              />
            </View>
          ) : rangeConsent ? (
            <View style={styles.list}>
              <AppText variant="caption" style={styles.listLabel}>
                {t('nearby.connections.timelineRangeLabel')}
              </AppText>
              <AppText variant="caption" style={styles.meta}>
                {t('nearby.connections.timelineRangeHint')}
              </AppText>
              <View style={styles.chipRow}>
                {([30, 90, 180] as const).map((days) => (
                  <ChoiceChip
                    key={days}
                    label={t('nearby.connections.timelinePreset', { days })}
                    selected={rangePreset === days}
                    onPress={() => {
                      const end = todayDateKey();
                      setRangePreset(days);
                      setPeriodEnd(end);
                      setPeriodStart(addCalendarDays(end, -(days - 1)));
                    }}
                    disabled={busy}
                  />
                ))}
                <ChoiceChip
                  label={t('nearby.connections.timelineCustom')}
                  selected={rangePreset === 'custom'}
                  onPress={() => {
                    setRangePreset('custom');
                    if (!isDateKey(periodStart) || !isDateKey(periodEnd)) {
                      const end = todayDateKey();
                      setPeriodEnd(end);
                      setPeriodStart(addCalendarDays(end, -29));
                    }
                  }}
                  disabled={busy}
                />
              </View>
              {rangePreset === 'custom' ? (
                <View style={styles.dateFields}>
                  <View style={styles.dateRow}>
                    <TimelineDatePicker
                      label={t('nearby.connections.timelineFrom')}
                      value={periodStart}
                      onChange={(next) => {
                        setPeriodStart(next);
                        if (isDateKey(periodEnd) && next > periodEnd) {
                          setPeriodEnd(next);
                        }
                      }}
                    />
                    <TimelineDatePicker
                      label={t('nearby.connections.timelineTo')}
                      value={periodEnd}
                      onChange={(next) => {
                        setPeriodEnd(next);
                        if (isDateKey(periodStart) && next < periodStart) {
                          setPeriodStart(next);
                        }
                      }}
                    />
                  </View>
                </View>
              ) : (
                <AppText variant="caption" style={styles.meta}>
                  {periodStart && periodEnd
                    ? t('nearby.connections.timelineWindow', { from: periodStart, to: periodEnd })
                    : null}
                </AppText>
              )}
              <Button
                label={t('nearby.connections.grantConfirmAction')}
                onPress={() =>
                  consentMutation.mutate({
                    scope: rangeConsent.scope,
                    granted: true,
                    definitionId: rangeConsent.definitionId,
                    periodStart,
                    periodEnd,
                  })
                }
                disabled={
                  busy ||
                  !isDateKey(periodStart) ||
                  !isDateKey(periodEnd) ||
                  periodEnd < periodStart
                }
                loading={busy}
              />
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setRangeConsent(null)}
                disabled={busy}
              />
            </View>
          ) : available.length > 0 ? (
            <Button
              label={t('nearby.connections.addConsent')}
              onPress={() => setPickingConsent(true)}
              disabled={busy}
            />
          ) : null}
        </View>

        <View style={[styles.card, shadow.soft]}>
          <View style={styles.sectionHeader}>
            <Unlink size={20} color={palette.danger} />
            <AppText variant="body" style={styles.sectionTitle}>
              {t('nearby.connections.disconnect')}
            </AppText>
          </View>
          <AppText variant="subtitle">{t('nearby.connections.disconnectHint')}</AppText>
          {disconnecting ? (
            <View style={styles.list}>
              <FormField label={t('nearby.connections.disconnectReasonLabel')}>
                <Input
                  value={disconnectReason}
                  onChangeText={setDisconnectReason}
                  placeholder={t('nearby.connections.disconnectReasonPlaceholder')}
                  multiline
                  editable={!busy}
                  style={styles.reasonInput}
                />
              </FormField>
              <Button
                label={t('nearby.connections.disconnectConfirmAction')}
                variant="secondary"
                onPress={() => disconnectMutation.mutate()}
                disabled={busy}
                loading={disconnectMutation.isPending}
              />
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => {
                  setDisconnecting(false);
                  setDisconnectReason('');
                }}
                disabled={busy}
              />
            </View>
          ) : (
            <Button
              label={t('nearby.connections.disconnect')}
              variant="secondary"
              onPress={() => setDisconnecting(true)}
              disabled={busy}
            />
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
  note: {
    marginTop: spacing.xs,
    color: palette.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  listLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  consentRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.divider,
  },
  consentCopy: {
    gap: 4,
  },
  consentTitle: {
    fontWeight: '600',
  },
  grantedBadge: {
    color: palette.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyConsent: {
    color: palette.textSecondary,
  },
  pickRow: {
    gap: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateFields: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
