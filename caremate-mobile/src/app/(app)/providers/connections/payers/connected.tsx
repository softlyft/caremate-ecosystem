import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function ConnectedPayersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'approved'],
    queryFn: () => payerConnectionService.listApproved(),
    enabled: !isGuest,
  });

  if (isGuest) {
    return (
      <Screen>
        <AppText variant="body">{t('nearby.connections.guest')}</AppText>
      </Screen>
    );
  }

  if (query.isLoading) {
    return <LoadingState title={t('nearby.connections.connectedPayersLoading')} />;
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

  const connected = query.data ?? [];

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">{t('nearby.connections.connectedPayersTitle')}</AppText>
        <AppText variant="subtitle">{t('nearby.connections.connectedPayersSubtitle')}</AppText>

        {connected.length === 0 ? (
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="body">{t('nearby.connections.connectedPayersEmpty')}</AppText>
          </View>
        ) : (
          connected.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, shadow.soft, pressed && styles.pressed]}
              onPress={() => router.push(`/(app)/providers/connections/payers/${item.id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={item.payerName ?? t('insurance.connections.payerFallback')}
            >
              <View style={styles.row}>
                <View style={styles.copy}>
                  <AppText variant="body" style={styles.orgName}>
                    {item.payerName ?? t('insurance.connections.payerFallback')}
                  </AppText>
                  <AppText variant="caption" style={styles.meta}>
                    {t('nearby.connections.connectedSince', {
                      date: new Date(item.approvedAt ?? item.createdAt).toLocaleDateString(),
                    })}
                  </AppText>
                </View>
                <ChevronRight size={20} color={palette.textSecondary} />
              </View>
            </Pressable>
          ))
        )}
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
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
  },
  pressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  orgName: {
    fontWeight: '600',
    fontSize: 16,
  },
  meta: {
    color: palette.textSecondary,
  },
});
