import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, Inbox, Send, Shield } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { ProfileCard, ProfileMenuRow } from '@/features/profile/ProfileMenuRow';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, spacing } from '@/theme';

export default function ProviderConnectionsHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();

  const providerInboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'inbound-count'],
    queryFn: () => providerConnectionService.countInboundPending(),
    enabled: !isGuest,
  });

  const providerConnectedCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'approved-count'],
    queryFn: async () => (await providerConnectionService.listApproved()).length,
    enabled: !isGuest,
  });

  const providerOutboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'outbound-count'],
    queryFn: async () => (await providerConnectionService.listOutboundPending()).length,
    enabled: !isGuest,
  });

  const payerInboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'inbound-count'],
    queryFn: () => payerConnectionService.countInboundPending(),
    enabled: !isGuest,
  });

  const payerConnectedCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'approved-count'],
    queryFn: async () => (await payerConnectionService.listApproved()).length,
    enabled: !isGuest,
  });

  const payerOutboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'outbound-count'],
    queryFn: async () => (await payerConnectionService.listOutboundPending()).length,
    enabled: !isGuest,
  });

  if (isGuest) {
    return (
      <Screen>
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  const providerInboundCount = providerInboundCountQuery.data ?? 0;
  const providerConnectedCount = providerConnectedCountQuery.data ?? 0;
  const providerOutboundCount = providerOutboundCountQuery.data ?? 0;
  const payerInboundCount = payerInboundCountQuery.data ?? 0;
  const payerConnectedCount = payerConnectedCountQuery.data ?? 0;
  const payerOutboundCount = payerOutboundCountQuery.data ?? 0;

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('nearby.connections.title')}</AppText>
        <AppText variant="subtitle">{t('nearby.connections.subtitle')}</AppText>

        <AppText variant="caption" style={styles.sectionLabel}>
          {t('nearby.connections.providersSectionTitle')}
        </AppText>
        <ProfileCard>
          <ProfileMenuRow
            icon={Building2}
            iconColor={palette.primary}
            iconBackground={palette.primaryLight}
            title={t('nearby.connections.connectedTitle')}
            subtitle={t('nearby.connections.connectedCount', { count: providerConnectedCount })}
            onPress={() => router.push('/providers/connections/connected' as Href)}
          />
          <View style={styles.divider} />
          <ProfileMenuRow
            icon={Inbox}
            iconColor={palette.brandBlue}
            iconBackground={palette.brandBlueLight}
            title={t('nearby.connections.requestsTitle')}
            subtitle={
              providerInboundCount > 0
                ? t('nearby.connections.requestsCount', { count: providerInboundCount })
                : t('nearby.connections.requestsEmptySubtitle')
            }
            onPress={() => router.push('/providers/connections/requests' as Href)}
          />
          <View style={styles.divider} />
          <ProfileMenuRow
            icon={Send}
            iconColor={palette.warning}
            iconBackground="#FEF3C7"
            title={t('nearby.connections.outboundTitle')}
            subtitle={
              providerOutboundCount > 0
                ? t('nearby.connections.outboundCount', { count: providerOutboundCount })
                : t('nearby.connections.outboundEmptySubtitle')
            }
            onPress={() => router.push('/providers/connections/outbound' as Href)}
          />
        </ProfileCard>

        <AppText variant="caption" style={styles.sectionLabel}>
          {t('nearby.connections.payersSectionTitle')}
        </AppText>
        <ProfileCard>
          <ProfileMenuRow
            icon={Shield}
            iconColor="#4F46E5"
            iconBackground="#E0E7FF"
            title={t('nearby.connections.connectedPayersTitle')}
            subtitle={t('nearby.connections.connectedPayersCount', { count: payerConnectedCount })}
            onPress={() => router.push('/providers/connections/payers/connected' as Href)}
          />
          <View style={styles.divider} />
          <ProfileMenuRow
            icon={Inbox}
            iconColor={palette.brandBlue}
            iconBackground={palette.brandBlueLight}
            title={t('nearby.connections.payerRequestsTitle')}
            subtitle={
              payerInboundCount > 0
                ? t('nearby.connections.payerRequestsCount', { count: payerInboundCount })
                : t('nearby.connections.payerRequestsEmptySubtitle')
            }
            onPress={() => router.push('/providers/connections/payers/requests' as Href)}
          />
          <View style={styles.divider} />
          <ProfileMenuRow
            icon={Send}
            iconColor={palette.warning}
            iconBackground="#FEF3C7"
            title={t('nearby.connections.payerOutboundTitle')}
            subtitle={
              payerOutboundCount > 0
                ? t('nearby.connections.payerOutboundCount', { count: payerOutboundCount })
                : t('nearby.connections.payerOutboundEmptySubtitle')
            }
            onPress={() => router.push('/providers/connections/payers/outbound' as Href)}
          />
        </ProfileCard>
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
    gap: spacing.md,
  },
  sectionLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 56,
  },
});
