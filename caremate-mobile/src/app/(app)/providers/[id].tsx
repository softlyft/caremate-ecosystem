import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import {
  BadgeCheck,
  ChevronRight,
  Heart,
  Link2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Shield,
  Star,
} from 'lucide-react-native';
import { useLayoutEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, FormActions, FormField, Input, TextLink } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { OrgCareTeamSection } from '@/components/connections/OrgCareTeamSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { useTranslation } from '@/domains/localization';
import { payerRepository } from '@/domains/payers/repository';
import { AdSlot } from '@/features/ads/AdSlot';
import { getProviderTypeTheme } from '@/domains/providers/components/NearbyProviderCard';
import {
  getProviderOrganizationId,
  providerConnectionService,
} from '@/domains/providers/connection-service';
import { canOpenInMaps, openInExternalMaps } from '@/domains/providers/open-in-maps';
import { providerRepository } from '@/domains/providers/repository';
import type { ProviderType } from '@/domains/providers/types';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';
import type { Provider } from '@/types';

function readRating(provider: Provider): number | null {
  const raw = provider.attributes.rating ?? provider.attributes.average_rating;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isCatalogVerified(provider: Provider): boolean {
  const raw = provider.attributes.verified ?? provider.attributes.is_verified;
  return raw === true || raw === 'true' || raw === 1;
}

export default function ProviderDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isGuest = useIsGuest();
  const [declining, setDeclining] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [openingMaps, setOpeningMaps] = useState(false);
  const openingMapsRef = useRef(false);

  const query = useQuery({
    queryKey: [...QUERY_KEYS.providers, id],
    queryFn: () => providerRepository.findById(id),
    enabled: Boolean(id),
  });

  const organizationId = query.data ? getProviderOrganizationId(query.data) : null;

  const orgVerifiedQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'verified', organizationId],
    queryFn: () => providerConnectionService.isOrganizationVerified(organizationId!),
    enabled: Boolean(organizationId) && !isGuest,
  });

  const connectionQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, organizationId],
    queryFn: () => providerConnectionService.getConnectionForOrganization(organizationId!),
    enabled: Boolean(organizationId) && !isGuest,
  });

  const supportedPayersQuery = useQuery({
    queryKey: [...QUERY_KEYS.payers, 'for-provider', organizationId],
    queryFn: () => payerRepository.listApprovedForProviderOrganization(organizationId!),
    enabled: Boolean(organizationId),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => providerRepository.toggleFavorite(id),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData([...QUERY_KEYS.providers, id], updated);
        queryClient.setQueryData<Provider[]>(QUERY_KEYS.providerFavorites, (current) => {
          if (!current) {
            return current;
          }
          if (updated.isFavorite) {
            const exists = current.some((item) => item.id === updated.id);
            return exists
              ? current.map((item) => (item.id === updated.id ? updated : item))
              : [...current, updated];
          }
          return current.filter((item) => item.id !== updated.id);
        });
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providers });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerFavorites });
    },
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      providerConnectionService.requestConnection({ organizationId: organizationId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      Alert.alert(t('nearby.detail.connectSuccessTitle'), t('nearby.detail.connectSuccessMessage'));
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.detail.connectFailedTitle'),
        error instanceof Error ? error.message : t('nearby.detail.connectFailedTitle'),
      );
    },
  });

  const respondMutation = useMutation({
    mutationFn: (params: { accept: boolean; rejectionReason?: string }) =>
      providerConnectionService.respondToRequest({
        connectionId: connectionQuery.data!.id,
        accept: params.accept,
        rejectionReason: params.rejectionReason,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      setDeclining(false);
      setRejectionReason('');
      Alert.alert(
        variables.accept
          ? t('nearby.detail.approveSuccessTitle')
          : t('nearby.connectionRequests.declinedTitle'),
        variables.accept
          ? t('nearby.detail.approveSuccessMessage')
          : t('nearby.connectionRequests.declinedMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.detail.respondFailedTitle'),
        error instanceof Error ? error.message : t('nearby.connectionRequests.failedMessage'),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      providerConnectionService.cancelPendingRequest(connectionQuery.data!.id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerConnections });
      setCancelling(false);
      setCancelReason('');
      Alert.alert(t('nearby.detail.cancelSuccessTitle'), t('nearby.detail.cancelSuccessMessage'));
    },
    onError: (error) => {
      Alert.alert(
        t('nearby.detail.cancelFailedTitle'),
        error instanceof Error ? error.message : t('nearby.connectionRequests.failedMessage'),
      );
    },
  });

  const provider = query.data ?? null;
  const theme = getProviderTypeTheme(provider?.type ?? 'hospital');
  const Icon = theme.icon;

  useLayoutEffect(() => {
    const shortTitle = provider?.name?.trim() || t('nearby.detail.provider');

    navigation.setOptions(
      glossyStackHeaderOptions({
        title: shortTitle,
        accent: theme.accent,
        soft: theme.soft,
        softEnd: theme.softEnd,
        titleColor: theme.accent,
        icon: Icon,
        backAccessibilityLabel: t('nearby.detail.backToNearby'),
        backFallbackHref: '/(app)/(tabs)/providers',
      }),
    );
  }, [Icon, navigation, provider?.name, t, theme.accent, theme.soft, theme.softEnd]);

  if (query.isLoading) {
    return <LoadingState title={t('nearby.detail.loading')} />;
  }

  if (!provider) {
    return <ErrorState title={t('nearby.detail.notFound')} />;
  }

  const detail = provider;
  const rating = readRating(detail);
  const catalogVerified = isCatalogVerified(detail);
  const orgVerified = orgVerifiedQuery.data === true;
  const connection = connectionQuery.data;
  const showConnectCard =
    !isGuest && Boolean(organizationId) && (Boolean(connection) || orgVerified);
  const typeKey = detail.type as ProviderType;
  const typeLabel = t(`nearby.types.${typeKey}`);
  const canOpenMaps = canOpenInMaps(detail);
  const distanceLabel =
    detail.distanceKm != null
      ? t('nearby.detail.distanceKm', { distance: detail.distanceKm.toFixed(1) })
      : null;

  async function openInMaps() {
    if (openingMapsRef.current || !canOpenMaps) {
      return;
    }
    openingMapsRef.current = true;
    setOpeningMaps(true);
    try {
      await openInExternalMaps({
        address: detail.address,
        latitude: detail.latitude,
        longitude: detail.longitude,
        label: detail.name,
      });
    } catch {
      // Maps handoff / permission denial must not leave the UI stuck.
    } finally {
      // `Linking.openURL` can resolve before the maps app / permission UI settles.
      setTimeout(() => {
        openingMapsRef.current = false;
        setOpeningMaps(false);
      }, 900);
    }
  }

  return (
    <Screen padded={false}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AnimatedSection index={0}>
          <View style={[styles.heroShell, shadow.card]}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: theme.soft },
                { offset: '50%', color: theme.soft },
                { offset: '100%', color: theme.softEnd },
              ]}
              angle={130}
              style={styles.hero}
            >
              <View style={styles.heroBlob} />
              <View style={[styles.heroBlobSm, { backgroundColor: theme.accent, opacity: 0.12 }]} />

              <View style={[styles.heroIconRing, { borderColor: `${theme.accent}33` }]}>
                <View style={[styles.heroIconInner, { backgroundColor: `${theme.accent}18` }]}>
                  <Icon color={theme.accent} size={28} strokeWidth={2.2} />
                </View>
              </View>

              <AppText variant="caption" style={[styles.heroEyebrow, { color: theme.accent }]}>
                {typeLabel}
              </AppText>
              <AppText variant="screenTitle" style={[styles.heroTitle, { color: theme.accent }]}>
                {detail.name}
              </AppText>

              <View style={styles.heroMeta}>
                {distanceLabel ? (
                  <View style={styles.metaPill}>
                    <MapPin color={theme.accent} size={13} />
                    <AppText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>
                      {distanceLabel}
                    </AppText>
                  </View>
                ) : null}
                {rating != null ? (
                  <View style={styles.metaPill}>
                    <Star color={palette.warning} size={13} fill={palette.warning} />
                    <AppText variant="caption" style={{ fontWeight: '600' }}>
                      {rating.toFixed(1)}
                    </AppText>
                  </View>
                ) : null}
                {catalogVerified ? (
                  <View style={[styles.metaPill, { backgroundColor: palette.primaryLight }]}>
                    <BadgeCheck color={palette.primary} size={13} />
                    <AppText
                      variant="caption"
                      style={{ color: palette.primary, fontWeight: '600' }}
                    >
                      {t('nearby.detail.verified')}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <AdSlot slotId={AD_SLOTS.NEARBY_PROVIDER} />
        </AnimatedSection>

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
              {t('nearby.detail.contact')}
            </AppText>

            <Button
              disabled={!canOpenMaps || openingMaps}
              onPress={() => void openInMaps()}
              style={styles.infoRow}
              variant="plain"
            >
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <MapPin color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  {t('nearby.detail.address')}
                </AppText>
                <AppText
                  variant="body"
                  style={[styles.infoValue, canOpenMaps ? { color: theme.accent } : null]}
                >
                  {detail.address ?? t('nearby.detail.addressUnavailable')}
                </AppText>
                {canOpenMaps ? (
                  <AppText variant="caption" style={{ color: theme.accent }}>
                    {t('nearby.detail.openInMapsHint')}
                  </AppText>
                ) : null}
              </View>
            </Button>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <Phone color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  {t('nearby.detail.phone')}
                </AppText>
                {detail.phone ? (
                  <TextLink external href={`tel:${detail.phone}`}>
                    {detail.phone}
                  </TextLink>
                ) : (
                  <AppText variant="body" style={styles.infoValue}>
                    {t('nearby.detail.phoneUnavailable')}
                  </AppText>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <Mail color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  {t('nearby.detail.email')}
                </AppText>
                {detail.email ? (
                  <TextLink external href={`mailto:${detail.email}`}>
                    {detail.email}
                  </TextLink>
                ) : (
                  <AppText variant="body" style={styles.infoValue}>
                    {t('nearby.detail.emailUnavailable')}
                  </AppText>
                )}
              </View>
            </View>
          </View>
        </AnimatedSection>

        {organizationId ? (
          <AnimatedSection index={3}>
            <View style={[styles.card, shadow.soft]}>
              <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                {t('nearby.detail.supportedPayers')}
              </AppText>
              <AppText variant="caption" style={styles.supportedPayersHint}>
                {t('nearby.detail.supportedPayersHint')}
              </AppText>
              {supportedPayersQuery.isLoading ? (
                <AppText variant="body" style={styles.connectStatus}>
                  {t('nearby.detail.loading')}
                </AppText>
              ) : (supportedPayersQuery.data?.length ?? 0) === 0 ? (
                <AppText variant="body" style={styles.connectStatus}>
                  {t('nearby.detail.supportedPayersEmpty')}
                </AppText>
              ) : (
                <View style={styles.supportedPayersList}>
                  {supportedPayersQuery.data!.map((payer, index) => (
                    <View key={payer.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <Button
                        style={styles.infoRow}
                        variant="plain"
                        onPress={() => router.push(`/(app)/profile/insurance/${payer.id}` as Href)}
                        accessibilityLabel={payer.name}
                      >
                        <View style={[styles.infoIcon, { backgroundColor: '#E0E7FF' }]}>
                          <Shield color="#4F46E5" size={18} />
                        </View>
                        <View style={styles.infoCopy}>
                          <AppText variant="body" style={styles.infoValue}>
                            {payer.name}
                          </AppText>
                          {payer.phone ? (
                            <AppText variant="caption" style={styles.supportedPayerMeta}>
                              {payer.phone}
                            </AppText>
                          ) : null}
                        </View>
                        <View
                          style={[styles.supportedPayerChevron, { backgroundColor: theme.soft }]}
                        >
                          <ChevronRight color={theme.accent} size={16} strokeWidth={2.5} />
                        </View>
                      </Button>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </AnimatedSection>
        ) : null}

        {showConnectCard ? (
          <AnimatedSection index={4}>
            <View style={[styles.card, shadow.soft]}>
              <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                {t('nearby.detail.connect')}
              </AppText>
              {connection?.status === 'approved' ? (
                <View style={styles.connectBlock}>
                  <AppText
                    variant="body"
                    style={[styles.connectStatus, { color: palette.primary }]}
                  >
                    {t('nearby.detail.connectApproved')}
                  </AppText>
                  <Button
                    style={[
                      styles.secondaryCta,
                      { backgroundColor: theme.soft, borderColor: theme.accent },
                    ]}
                    onPress={() =>
                      router.push(`/(app)/providers/connections/${connection.id}` as Href)
                    }
                    variant="plain"
                  >
                    <AppText variant="button" style={{ color: theme.accent }}>
                      {t('nearby.careTeam.manageConnection')}
                    </AppText>
                  </Button>
                </View>
              ) : connection?.status === 'rejected' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('nearby.detail.connectRejectedFinal')}
                  </AppText>
                  {connection.rejectionReason ? (
                    <AppText variant="caption" style={styles.connectHint}>
                      {connection.rejectionReason}
                    </AppText>
                  ) : null}
                </View>
              ) : connection?.status === 'pending' && connection.initiatedBy === 'provider' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('nearby.detail.connectPendingInbound')}
                  </AppText>
                  {connection.providerNote ? (
                    <AppText variant="caption" style={styles.connectHint}>
                      {connection.providerNote}
                    </AppText>
                  ) : null}
                  {declining ? (
                    <>
                      <FormField>
                        <Input
                          value={rejectionReason}
                          onChangeText={setRejectionReason}
                          placeholder={t('nearby.connectionRequests.reasonPlaceholder')}
                          multiline
                          editable={!respondMutation.isPending}
                          style={styles.reasonInput}
                        />
                      </FormField>
                      <FormActions style={styles.connectRow}>
                        <Button
                          style={[
                            styles.secondaryCta,
                            { backgroundColor: theme.soft, borderColor: theme.accent, flex: 1 },
                          ]}
                          disabled={respondMutation.isPending}
                          onPress={() => {
                            setDeclining(false);
                            setRejectionReason('');
                          }}
                          variant="plain"
                        >
                          <AppText variant="button" style={{ color: theme.accent }}>
                            {t('common.cancel')}
                          </AppText>
                        </Button>
                        <Button
                          style={[
                            styles.primaryCta,
                            { backgroundColor: theme.accent, flex: 1 },
                            shadow.soft,
                          ]}
                          disabled={respondMutation.isPending}
                          onPress={() =>
                            respondMutation.mutate({
                              accept: false,
                              rejectionReason,
                            })
                          }
                          variant="plain"
                        >
                          <AppText variant="button" style={styles.primaryCtaLabel}>
                            {t('nearby.connectionRequests.confirmDecline')}
                          </AppText>
                        </Button>
                      </FormActions>
                    </>
                  ) : (
                    <FormActions style={styles.connectRow}>
                      <Button
                        style={[
                          styles.primaryCta,
                          { backgroundColor: theme.accent, flex: 1 },
                          shadow.soft,
                        ]}
                        disabled={respondMutation.isPending}
                        onPress={() => respondMutation.mutate({ accept: true })}
                        variant="plain"
                      >
                        <AppText variant="button" style={styles.primaryCtaLabel}>
                          {t('nearby.detail.approveInbound')}
                        </AppText>
                      </Button>
                      <Button
                        style={[
                          styles.secondaryCta,
                          { backgroundColor: theme.soft, borderColor: theme.accent, flex: 1 },
                        ]}
                        disabled={respondMutation.isPending}
                        onPress={() => setDeclining(true)}
                        variant="plain"
                      >
                        <AppText variant="button" style={{ color: theme.accent }}>
                          {t('nearby.detail.declineInbound')}
                        </AppText>
                      </Button>
                    </FormActions>
                  )}
                </View>
              ) : connection?.status === 'pending' && connection.initiatedBy === 'patient' ? (
                <View style={styles.connectBlock}>
                  <AppText variant="body" style={styles.connectStatus}>
                    {t('nearby.detail.connectPendingOutbound')}
                  </AppText>
                  {cancelling ? (
                    <>
                      <AppText variant="caption" style={styles.connectHint}>
                        {t('nearby.detail.cancelRequestHint')}
                      </AppText>
                      <FormField>
                        <Input
                          value={cancelReason}
                          onChangeText={setCancelReason}
                          placeholder={t('nearby.detail.cancelReasonPlaceholder')}
                          multiline
                          editable={!cancelMutation.isPending}
                          style={styles.reasonInput}
                        />
                      </FormField>
                      <FormActions style={styles.connectRow}>
                        <Button
                          style={[
                            styles.secondaryCta,
                            { backgroundColor: theme.soft, borderColor: theme.accent, flex: 1 },
                          ]}
                          disabled={cancelMutation.isPending}
                          onPress={() => {
                            setCancelling(false);
                            setCancelReason('');
                          }}
                          variant="plain"
                        >
                          <AppText variant="button" style={{ color: theme.accent }}>
                            {t('common.cancel')}
                          </AppText>
                        </Button>
                        <Button
                          style={[
                            styles.primaryCta,
                            { backgroundColor: theme.accent, flex: 1 },
                            shadow.soft,
                          ]}
                          disabled={cancelMutation.isPending}
                          onPress={() => cancelMutation.mutate()}
                          variant="plain"
                        >
                          <AppText variant="button" style={styles.primaryCtaLabel}>
                            {t('nearby.detail.confirmCancelRequest')}
                          </AppText>
                        </Button>
                      </FormActions>
                    </>
                  ) : (
                    <Button
                      style={[
                        styles.secondaryCta,
                        { backgroundColor: theme.soft, borderColor: theme.accent },
                      ]}
                      disabled={cancelMutation.isPending}
                      onPress={() => setCancelling(true)}
                      variant="plain"
                    >
                      <AppText variant="button" style={{ color: theme.accent }}>
                        {t('nearby.detail.cancelRequest')}
                      </AppText>
                    </Button>
                  )}
                </View>
              ) : connection?.status === 'pending' ? (
                <AppText variant="body" style={styles.connectStatus}>
                  {t('nearby.detail.connectPendingOutbound')}
                </AppText>
              ) : (
                <View style={styles.connectBlock}>
                  <AppText variant="caption" style={styles.connectHint}>
                    {t('nearby.detail.connectHint')}
                  </AppText>
                  <Button
                    style={[styles.primaryCta, { backgroundColor: theme.accent }, shadow.soft]}
                    disabled={connectMutation.isPending || connectionQuery.isLoading}
                    onPress={() => connectMutation.mutate()}
                    variant="plain"
                  >
                    <Link2 color="#FFFFFF" size={18} strokeWidth={2.25} />
                    <AppText variant="button" style={styles.primaryCtaLabel}>
                      {t('nearby.detail.connect')}
                    </AppText>
                  </Button>
                </View>
              )}
            </View>
          </AnimatedSection>
        ) : null}

        {connection?.status === 'approved' && organizationId ? (
          <AnimatedSection index={5}>
            <OrgCareTeamSection orgKind="provider" orgId={organizationId} enabled />
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={6}>
          <View style={styles.actions}>
            <Button
              style={[
                styles.primaryCta,
                { backgroundColor: theme.accent },
                !canOpenMaps || openingMaps ? styles.ctaDisabled : null,
                shadow.soft,
              ]}
              disabled={!canOpenMaps || openingMaps}
              onPress={() => void openInMaps()}
              variant="plain"
            >
              <Navigation color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {t('nearby.detail.openInMaps')}
              </AppText>
            </Button>

            <Button
              style={[
                styles.secondaryCta,
                {
                  backgroundColor: theme.soft,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
              variant="plain"
            >
              <Heart
                color={theme.accent}
                size={18}
                strokeWidth={2.25}
                fill={detail.isFavorite ? theme.accent : 'transparent'}
              />
              <AppText variant="button" style={{ color: theme.accent }}>
                {detail.isFavorite ? t('nearby.detail.unfavorite') : t('nearby.detail.favorite')}
              </AppText>
            </Button>
          </View>
        </AnimatedSection>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  hero: {
    padding: layoutSpacing.cardPadding + 4,
    gap: 8,
    minHeight: 188,
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroBlobSm: {
    position: 'absolute',
    bottom: 24,
    left: -36,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  heroIconRing: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
  },
  heroIconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 54,
  },
  actions: {
    gap: 12,
  },
  connectBlock: {
    gap: 12,
  },
  connectStatus: {
    fontSize: 15,
    lineHeight: 21,
  },
  connectHint: {
    color: palette.textSecondary,
    marginBottom: 4,
  },
  supportedPayersHint: {
    color: palette.textSecondary,
    marginBottom: 8,
  },
  supportedPayersList: {
    gap: 0,
  },
  supportedPayerMeta: {
    color: palette.textSecondary,
  },
  supportedPayerChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 54,
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
    minHeight: 54,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
});
