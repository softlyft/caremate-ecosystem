import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, Inbox } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
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

  if (isGuest) {
    return (
      <View style={styles.padded}>
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </View>
    );
  }

  const inboundCount = inboundCountQuery.data ?? 0;
  const connectedCount = connectedCountQuery.data ?? 0;

  return (
    <ScrollView
      style={styles.screen}
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
      </ProfileCard>
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 56,
  },
});
