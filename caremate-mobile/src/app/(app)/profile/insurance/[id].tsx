import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Globe, Link2, Mail, MapPin, Phone, Shield } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { AppText } from '@/components/ui/AppText';
import { Button, FormActions, FormField, Input, TextLink } from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { payerRepository } from '@/domains/payers/repository';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

const THEME = {
  accent: '#4F46E5',
  soft: '#E0E7FF',
  softEnd: '#EEF2FF',
} as const;

export default function InsuranceOrgDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const isGuest = useIsGuest();
  const [declining, setDeclining] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState('');

  const query = useQuery({
    queryKey: [...QUERY_KEYS.payers, id],
    queryFn: () => payerRepository.findById(id),
    enabled: Boolean(id),
  });

  const payerVerifiedQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'verified', id],
    queryFn: () => payerConnectionService.isOrganizationVerified(id),
    enabled: Boolean(id) && !isGuest,
  });

  const connectionQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, id],
    queryFn: () => payerConnectionService.getConnectionForPayerOrganization(id),
    enabled: Boolean(id) && !isGuest,
  });

  const connectMutation = useMutation({
    mutationFn: () => payerConnectionService.requestConnection({ payerOrganizationId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      Alert.alert(
        t('insurance.connections.connectSuccessTitle'),
        t('insurance.connections.connectSuccessMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.connectFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.connectFailedTitle'),
      );
    },
  });

  const respondMutation = useMutation({
    mutationFn: (params: { accept: boolean; rejectionReason?: string }) =>
      payerConnectionService.respondToRequest({
        connectionId: connectionQuery.data!.id,
        accept: params.accept,
        rejectionReason: params.rejectionReason,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setDeclining(false);
      setRejectionReason('');
      Alert.alert(
        variables.accept
          ? t('insurance.connections.approveSuccessTitle')
          : t('insurance.connections.declinedTitle'),
        variables.accept
          ? t('insurance.connections.approveSuccessMessage')
          : t('insurance.connections.declinedMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.respondFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      payerConnectionService.cancelPendingRequest(connectionQuery.data!.id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setCancelling(false);
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
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      payerConnectionService.disconnectConnection(connectionQuery.data!.id, disconnectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      setDisconnecting(false);
      setDisconnectReason('');
      Alert.alert(
        t('insurance.connections.disconnectSuccessTitle'),
        t('insurance.connections.disconnectSuccessMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.disconnectFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions(
      glossyStackHeaderOptions({
        title: query.data?.name ?? t('insurance.detail.title'),
        accent: THEME.accent,
        soft: THEME.soft,
        softEnd: THEME.softEnd,
        titleColor: THEME.accent,
        icon: Shield,
        backAccessibilityLabel: t('insurance.detail.backA11y'),
      }),
    );
  }, [navigation, query.data?.name, t]);

  if (query.isLoading) {
    return (
      <Screen tone="background" padded={false}>
        <LoadingState title={t('insurance.detail.loading')} />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen tone="background" padded={false}>
        <ErrorState
          title={t('insurance.detail.notFoundTitle')}
          message={
            query.error instanceof Error
              ? query.error.message
              : t('insurance.detail.notFoundMessage')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  const payer = query.data;
  const connection = connectionQuery.data;
  const payerVerified = payerVerifiedQuery.data === true;
  // Mirror providers: Connect only for verified (claimed) payers; keep card if a connection already exists.
  const showConnectCard = !isGuest && (Boolean(connection) || payerVerified);
  const websiteUrl = payer.website?.trim()
    ? payer.website.startsWith('http')
      ? payer.website
      : `https://${payer.website}`
    : null;

  return (
    <Screen tone="background" padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection index={0}>
          <View style={[styles.hero, shadow.soft]}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: THEME.soft },
                { offset: '100%', color: THEME.softEnd },
              ]}
              angle={140}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroIconWrap}>
              <Shield color={THEME.accent} size={28} strokeWidth={2.25} />
            </View>
            <AppText variant="screenTitle" style={styles.heroTitle}>
              {payer.name}
            </AppText>
            <View style={styles.typePill}>
              <AppText variant="caption" style={styles.typePillLabel}>
                {t('insurance.orgType')}
              </AppText>
            </View>
          </View>
        </AnimatedSection>

        {showConnectCard ? (
          <AnimatedSection index={1}>
            <View style={styles.card}>
              <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                {t('insurance.connections.connect')}
              </AppText>
              {connection?.status === 'approved' ? (
                <View style={styles.connectBlock}>
                  <AppText
                    variant="body"
                    style={[styles.connectStatus, { color: palette.primary }]}
                  >
                    {t('insurance.connections.connectApproved')}
                  </AppText>
                  {disconnecting ? (
                    <>
                      <FormField>
                        <Input
                          value={disconnectReason}
                          onChangeText={setDisconnectReason}
                          placeholder={t('insurance.connections.disconnectReasonPlaceholder')}
                          multiline
                          editable={!disconnectMutation.isPending}
                          style={styles.reasonInput}
                        />
                      </FormField>
                      <FormActions style={styles.connectRow}>
                        <Button
                          style={styles.secondaryCta}
                          disabled={disconnectMutation.isPending}
                          onPress={() => {
                            setDisconnecting(false);
                            setDisconnectReason('');
                          }}
                          variant="plain"
                        >
                          <AppText variant="button" style={{ color: THEME.accent }}>
                            {t('common.cancel')}
                          </AppText>
                        </Button>
                        <Button
                          style={[styles.primaryCta, { backgroundColor: THEME.accent }]}
                          disabled={disconnectMutation.isPending}
                          onPress={() => disconnectMutation.mutate()}
                          variant="plain"
                        >
                          <AppText variant="button" style={styles.primaryCtaLabel}>
                            {t('insurance.connections.disconnectConfirmAction')}
                          </AppText>
                        </Button>
                      </FormActions>
                    </>
                  ) : (
                    <Button
                      style={styles.secondaryCta}
                      disabled={disconnectMutation.isPending}
                      onPress={() => setDisconnecting(true)}
                      variant="plain"
                    >
                      <AppText variant="button" style={{ color: THEME.accent }}>
                        {t('insurance.connections.disconnect')}
                      </AppText>
                    </Button>
                  )}
                </View>
              ) : connection?.status === 'rejected' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('insurance.connections.connectRejectedFinal')}
                  </AppText>
                  {connection.rejectionReason ? (
                    <AppText variant="caption" style={styles.connectHint}>
                      {connection.rejectionReason}
                    </AppText>
                  ) : null}
                </View>
              ) : connection?.status === 'pending' && connection.initiatedBy === 'payer' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('insurance.connections.connectPendingInbound')}
                  </AppText>
                  {connection.payerNote ? (
                    <AppText variant="caption" style={styles.connectHint}>
                      {connection.payerNote}
                    </AppText>
                  ) : null}
                  {declining ? (
                    <>
                      <FormField>
                        <Input
                          value={rejectionReason}
                          onChangeText={setRejectionReason}
                          placeholder={t('insurance.connections.reasonPlaceholder')}
                          multiline
                          editable={!respondMutation.isPending}
                          style={styles.reasonInput}
                        />
                      </FormField>
                      <FormActions style={styles.connectRow}>
                        <Button
                          style={styles.secondaryCta}
                          disabled={respondMutation.isPending}
                          onPress={() => {
                            setDeclining(false);
                            setRejectionReason('');
                          }}
                          variant="plain"
                        >
                          <AppText variant="button" style={{ color: THEME.accent }}>
                            {t('common.cancel')}
                          </AppText>
                        </Button>
                        <Button
                          style={[styles.primaryCta, { backgroundColor: THEME.accent }]}
                          disabled={respondMutation.isPending}
                          onPress={() => respondMutation.mutate({ accept: false, rejectionReason })}
                          variant="plain"
                        >
                          <AppText variant="button" style={styles.primaryCtaLabel}>
                            {t('insurance.connections.confirmDecline')}
                          </AppText>
                        </Button>
                      </FormActions>
                    </>
                  ) : (
                    <View style={styles.connectRow}>
                      <Button
                        style={[styles.primaryCta, { backgroundColor: THEME.accent, flex: 1 }]}
                        disabled={respondMutation.isPending}
                        onPress={() => respondMutation.mutate({ accept: true })}
                        variant="plain"
                      >
                        <AppText variant="button" style={styles.primaryCtaLabel}>
                          {t('insurance.connections.approveInbound')}
                        </AppText>
                      </Button>
                      <Button
                        style={[styles.secondaryCta, { flex: 1 }]}
                        disabled={respondMutation.isPending}
                        onPress={() => setDeclining(true)}
                        variant="plain"
                      >
                        <AppText variant="button" style={{ color: THEME.accent }}>
                          {t('insurance.connections.declineInbound')}
                        </AppText>
                      </Button>
                    </View>
                  )}
                </View>
              ) : connection?.status === 'pending' && connection.initiatedBy === 'patient' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('insurance.connections.connectPendingOutbound')}
                  </AppText>
                  {cancelling ? (
                    <>
                      <FormField>
                        <Input
                          value={cancelReason}
                          onChangeText={setCancelReason}
                          placeholder={t('insurance.connections.cancelReasonPlaceholder')}
                          multiline
                          editable={!cancelMutation.isPending}
                          style={styles.reasonInput}
                        />
                      </FormField>
                      <FormActions style={styles.connectRow}>
                        <Button
                          style={styles.secondaryCta}
                          disabled={cancelMutation.isPending}
                          onPress={() => {
                            setCancelling(false);
                            setCancelReason('');
                          }}
                          variant="plain"
                        >
                          <AppText variant="button" style={{ color: THEME.accent }}>
                            {t('common.cancel')}
                          </AppText>
                        </Button>
                        <Button
                          style={[styles.primaryCta, { backgroundColor: THEME.accent }]}
                          disabled={cancelMutation.isPending}
                          onPress={() => cancelMutation.mutate()}
                          variant="plain"
                        >
                          <AppText variant="button" style={styles.primaryCtaLabel}>
                            {t('insurance.connections.confirmCancelRequest')}
                          </AppText>
                        </Button>
                      </FormActions>
                    </>
                  ) : (
                    <Button
                      style={styles.secondaryCta}
                      disabled={cancelMutation.isPending}
                      onPress={() => setCancelling(true)}
                      variant="plain"
                    >
                      <AppText variant="button" style={{ color: THEME.accent }}>
                        {t('insurance.connections.cancelRequest')}
                      </AppText>
                    </Button>
                  )}
                </View>
              ) : (
                <View style={styles.connectBlock}>
                  <AppText variant="caption" style={styles.connectHint}>
                    {t('insurance.connections.connectHint')}
                  </AppText>
                  <Button
                    style={[styles.primaryCta, { backgroundColor: THEME.accent }]}
                    disabled={connectMutation.isPending || connectionQuery.isLoading}
                    onPress={() => connectMutation.mutate()}
                    variant="plain"
                  >
                    <Link2 color="#FFFFFF" size={18} strokeWidth={2.25} />
                    <AppText variant="button" style={styles.primaryCtaLabel}>
                      {t('insurance.connections.connect')}
                    </AppText>
                  </Button>
                </View>
              )}
            </View>
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={2}>
          <View style={styles.card}>
            <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
              {t('insurance.detail.contact')}
            </AppText>

            {payer.address ? (
              <View style={styles.row}>
                <MapPin color={palette.textSecondary} size={18} />
                <AppText variant="body" style={styles.rowText}>
                  {payer.address}
                </AppText>
              </View>
            ) : null}

            {payer.phone ? (
              <View style={styles.row}>
                <Phone color={THEME.accent} size={18} />
                <TextLink
                  external
                  href={`tel:${payer.phone}`}
                  accessibilityLabel={t('insurance.detail.callA11y', { phone: payer.phone })}
                >
                  {payer.phone}
                </TextLink>
              </View>
            ) : null}

            {payer.email ? (
              <View style={styles.row}>
                <Mail color={THEME.accent} size={18} />
                <TextLink
                  external
                  href={`mailto:${payer.email}`}
                  accessibilityLabel={t('insurance.detail.emailA11y', { email: payer.email })}
                >
                  {payer.email}
                </TextLink>
              </View>
            ) : null}

            {websiteUrl ? (
              <View style={styles.row}>
                <Globe color={THEME.accent} size={18} />
                <TextLink
                  external
                  href={websiteUrl}
                  accessibilityLabel={t('insurance.detail.websiteA11y')}
                >
                  {payer.website}
                </TextLink>
              </View>
            ) : null}

            {!payer.address && !payer.phone && !payer.email && !websiteUrl ? (
              <AppText variant="body" style={styles.emptyContact}>
                {t('insurance.detail.noContact')}
              </AppText>
            ) : null}
          </View>
        </AnimatedSection>

        <AnimatedSection index={3}>
          <AppText variant="caption" style={styles.footnote}>
            {t('insurance.detail.footnote')}
          </AppText>
        </AnimatedSection>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.sm,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: THEME.accent,
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typePillLabel: {
    color: THEME.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.md,
    ...shadow.soft,
  },
  sectionEyebrow: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  connectBlock: {
    gap: spacing.sm,
  },
  connectStatus: {
    fontSize: 15,
    lineHeight: 21,
  },
  connectHint: {
    color: palette.textSecondary,
  },
  connectRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryCta: {
    minHeight: 48,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    minHeight: 48,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    color: textColors.primary,
  },
  emptyContact: {
    color: textColors.secondary,
  },
  footnote: {
    color: textColors.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
