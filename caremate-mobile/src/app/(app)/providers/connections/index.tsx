import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, Inbox, Send } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { ProfileCard, ProfileMenuRow } from '@/features/profile/ProfileMenuRow';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, spacing } from '@/theme';

export default function ProviderConnectionsHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();

  const inboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'inbound-count'],
    queryFn: () => providerConnectionService.countInboundPending(),
    enabled: !isGuest,
  });

  const connectedCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'approved-count'],
    queryFn: async () => (await providerConnectionService.listApproved()).length,
    enabled: !isGuest,
  });

  const outboundCountQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'outbound-count'],
    queryFn: async () => (await providerConnectionService.listOutboundPending()).length,
    enabled: !isGuest,
  });

  if (isGuest) {
    return (
      <Screen>
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  const inboundCount = inboundCountQuery.data ?? 0;
  const connectedCount = connectedCountQuery.data ?? 0;
  const outboundCount = outboundCountQuery.data ?? 0;

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('nearby.connections.title')}</AppText>
        <AppText variant="subtitle">{t('nearby.connections.subtitle')}</AppText>

        <ProfileCard>
          <ProfileMenuRow
            icon={Building2}
            iconColor={palette.primary}
            iconBackground={palette.primaryLight}
            title={t('nearby.connections.connectedTitle')}
            subtitle={t('nearby.connections.connectedCount', { count: connectedCount })}
            onPress={() => router.push('/providers/connections/connected' as Href)}
          />
          <View style={styles.divider} />
          <ProfileMenuRow
            icon={Inbox}
            iconColor={palette.brandBlue}
            iconBackground={palette.brandBlueLight}
            title={t('nearby.connections.requestsTitle')}
            subtitle={
              inboundCount > 0
                ? t('nearby.connections.requestsCount', { count: inboundCount })
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
              outboundCount > 0
                ? t('nearby.connections.outboundCount', { count: outboundCount })
                : t('nearby.connections.outboundEmptySubtitle')
            }
            onPress={() => router.push('/providers/connections/outbound' as Href)}
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 56,
  },
});
