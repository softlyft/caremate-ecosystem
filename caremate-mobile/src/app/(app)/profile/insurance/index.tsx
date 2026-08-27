import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Search, Shield } from 'lucide-react-native';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { PayerDirectoryCard } from '@/domains/payers/components/PayerDirectoryCard';
import { payerConnectionService } from '@/domains/payers/connection-service';
import { PAYER_DIRECTORY_PAGE_SIZE, payerRepository } from '@/domains/payers/repository';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

export default function InsuranceDirectoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { online } = useNetworkStatus();
  const isGuest = useIsGuest();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const trimmedSearch = deferredSearch.trim();
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const approvedQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'approved'],
    queryFn: () => payerConnectionService.listApproved(),
    enabled: !isGuest,
  });

  const inboundQuery = useQuery({
    queryKey: [...QUERY_KEYS.payerConnections, 'inbound'],
    queryFn: () => payerConnectionService.listInboundPending(),
    enabled: !isGuest,
  });

  const respondMutation = useMutation({
    mutationFn: (params: { connectionId: string; accept: boolean }) =>
      payerConnectionService.respondToRequest(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
      Alert.alert(
        variables.accept
          ? t('insurance.connections.approvedTitle')
          : t('insurance.connections.declinedTitle'),
        variables.accept
          ? t('insurance.connections.approvedMessage')
          : t('insurance.connections.declinedMessage'),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('insurance.connections.respondFailedTitle'),
        error instanceof Error ? error.message : t('insurance.connections.failedMessage'),
      );
    },
    onSettled: () => setBusyRequestId(null),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => payerConnectionService.disconnectConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payerConnections });
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
    onSettled: () => setBusyRequestId(null),
  });

  const confirmDisconnect = (connectionId: string) => {
    Alert.alert(
      t('insurance.connections.disconnectConfirmTitle'),
      t('insurance.connections.disconnectConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('insurance.connections.disconnectConfirmAction'),
          style: 'destructive',
          onPress: () => {
            setBusyRequestId(connectionId);
            disconnectMutation.mutate(connectionId);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const query = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.payers, trimmedSearch],
    queryFn: ({ pageParam }) =>
      payerRepository.listPage({
        search: trimmedSearch,
        page: pageParam,
        pageSize: PAYER_DIRECTORY_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 30_000,
  });

  const payers = useMemo(() => query.data?.pages.flatMap((page) => page.rows) ?? [], [query.data]);
  const connected = approvedQuery.data ?? [];
  const inbound = inboundQuery.data ?? [];

  if (query.isLoading && query.data === undefined) {
    return (
      <View style={styles.screen}>
        <LoadingState title={t('insurance.loading')} />
      </View>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <View style={styles.screen}>
        <ErrorState
          title={t('insurance.loadFailed.title')}
          message={
            query.error instanceof Error ? query.error.message : t('insurance.loadFailed.message')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void query.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={payers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.sm },
          payers.length === 0 ? styles.listFill : null,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AnimatedSection index={0}>
              <View style={styles.hero}>
                <View style={styles.meshTop} />
                <View style={styles.meshAccent} />
                <View style={styles.heroBadge}>
                  <Shield color={palette.primary} size={15} strokeWidth={2.25} />
                  <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                    {t('insurance.count', { count: payers.length })}
                  </AppText>
                </View>
                <AppText variant="screenTitle" style={styles.title}>
                  {t('insurance.title')}
                </AppText>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {t('insurance.subtitle')}
                </AppText>
              </View>
            </AnimatedSection>

            <OfflineBanner flush />

            {!isGuest && inbound.length > 0 ? (
              <AnimatedSection index={1}>
                <View style={[styles.connectionCard, shadow.soft]}>
                  <AppText variant="sectionTitle">{t('insurance.connections.inboundTitle')}</AppText>
                  <AppText variant="subtitle" style={styles.connectionSubtitle}>
                    {t('insurance.connections.inboundSubtitle')}
                  </AppText>
                  {inbound.map((request) => (
                    <View key={request.id} style={styles.inboundRow}>
                      <Pressable
                        style={styles.inboundCopy}
                        onPress={() =>
                          router.push(`/(app)/profile/insurance/${request.payerOrganizationId}` as Href)
                        }
                      >
                        <AppText variant="body" style={styles.inboundName}>
                          {request.payerName ?? t('insurance.connections.payerFallback')}
                        </AppText>
                        {request.payerNote ? (
                          <AppText variant="caption" style={styles.inboundNote}>
                            {request.payerNote}
                          </AppText>
                        ) : null}
                      </Pressable>
                      <View style={styles.inboundActions}>
                        <Button
                          label={t('insurance.connections.approveInbound')}
                          onPress={() => {
                            setBusyRequestId(request.id);
                            respondMutation.mutate({ connectionId: request.id, accept: true });
                          }}
                          disabled={respondMutation.isPending}
                          loading={busyRequestId === request.id && respondMutation.isPending}
                        />
                        <Button
                          label={t('insurance.connections.declineInbound')}
                          variant="secondary"
                          onPress={() =>
                            router.push(`/(app)/profile/insurance/${request.payerOrganizationId}` as Href)
                          }
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </AnimatedSection>
            ) : null}

            {!isGuest && connected.length > 0 ? (
              <AnimatedSection index={2}>
                <View style={[styles.connectionCard, shadow.soft]}>
                  <AppText variant="sectionTitle">
                    {t('insurance.connections.connectedSectionTitle')}
                  </AppText>
                  <AppText variant="subtitle" style={styles.connectionSubtitle}>
                    {t('insurance.connections.connectedSectionSubtitle')}
                  </AppText>
                  {connected.map((item) => (
                    <View key={item.id} style={styles.connectedBlock}>
                      <Pressable
                        style={({ pressed }) => [styles.connectedCopy, pressed && styles.pressed]}
                        onPress={() =>
                          router.push(
                            `/(app)/profile/insurance/${item.payerOrganizationId}` as Href,
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          item.payerName ?? t('insurance.connections.payerFallback')
                        }
                      >
                        <AppText variant="body" style={styles.inboundName}>
                          {item.payerName ?? t('insurance.connections.payerFallback')}
                        </AppText>
                        <AppText variant="caption" style={styles.inboundNote}>
                          {t('insurance.connections.connectedSince', {
                            date: new Date(item.approvedAt ?? item.createdAt).toLocaleDateString(),
                          })}
                        </AppText>
                      </Pressable>
                      <Button
                        label={t('insurance.connections.disconnect')}
                        variant="secondary"
                        onPress={() => confirmDisconnect(item.id)}
                        disabled={disconnectMutation.isPending || respondMutation.isPending}
                        loading={busyRequestId === item.id && disconnectMutation.isPending}
                      />
                    </View>
                  ))}
                </View>
              </AnimatedSection>
            ) : null}

            {!online ? (
              <AppText variant="caption" style={styles.statusNote}>
                {t('insurance.offline')}
              </AppText>
            ) : null}

            <View style={[styles.searchShell, shadow.soft]}>
              <View style={styles.searchIcon}>
                <Search color={palette.primary} size={16} strokeWidth={2.5} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder={t('insurance.searchPlaceholder')}
                placeholderTextColor={textColors.placeholder}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PayerDirectoryCard
            payer={item}
            typeLabel={t('insurance.orgType')}
            onPress={() => router.push(`/(app)/profile/insurance/${item.id}` as Href)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={trimmedSearch ? t('insurance.empty.searchTitle') : t('insurance.empty.title')}
            message={
              trimmedSearch ? t('insurance.empty.searchMessage') : t('insurance.empty.message')
            }
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  listFill: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    ...shadow.soft,
  },
  meshTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E0E7FF',
    opacity: 0.55,
    top: -70,
    right: -40,
  },
  meshAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.primaryLight,
    opacity: 0.5,
    bottom: -50,
    left: -30,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  heroBadgeLabel: {
    fontWeight: '600',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    color: textColors.secondary,
  },
  statusNote: {
    color: textColors.secondary,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: textColors.primary,
    paddingVertical: spacing.sm,
  },
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  connectionCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.sm,
  },
  connectionSubtitle: {
    color: textColors.secondary,
    marginBottom: spacing.xs,
  },
  inboundRow: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.divider,
  },
  inboundCopy: {
    gap: 4,
  },
  inboundName: {
    fontWeight: '600',
  },
  inboundNote: {
    color: textColors.secondary,
  },
  inboundActions: {
    gap: spacing.sm,
  },
  connectedBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.divider,
  },
  connectedCopy: {
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
