import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FormNotice, SearchField } from '@/components/ui/form-controls';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { config } from '@/constants/env';
import { useTranslation } from '@/domains/localization';
import {
  formatDirectMessageStartAlert,
  searchMessageableUsers,
  startDirectConversation,
  type MessageableUser,
} from '@/domains/messaging/repository';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, spacing } from '@/theme';

export default function NewMessageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [startingId, setStartingId] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: [...QUERY_KEYS.messages, 'search', deferredQuery],
    queryFn: () => searchMessageableUsers(deferredQuery),
    enabled: !isGuest && config.isSupabaseConfigured && deferredQuery.length >= 2,
    staleTime: 15_000,
  });

  async function handleSelect(user: MessageableUser) {
    if (startingId) return;
    setStartingId(user.user_id);
    try {
      const { conversationId } = await startDirectConversation({
        otherUserId: user.user_id,
        organizationId: user.organization_id,
      });
      router.replace(`/(app)/messages/${conversationId}`);
    } catch (error) {
      Alert.alert(t('messages.startFailedTitle'), formatDirectMessageStartAlert(error, t));
    } finally {
      setStartingId(null);
    }
  }

  const results = searchQuery.data ?? [];

  return (
    <Screen padded={false} style={{ paddingBottom: insets.bottom + spacing.md }}>
      <View style={styles.searchWrap}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('messages.searchPlaceholder')}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            clearButtonMode: 'while-editing',
          }}
        />
        <FormNotice>{t('messages.searchHint')}</FormNotice>
      </View>

      {deferredQuery.length < 2 ? (
        <EmptyState
          title={t('messages.searchEmptyTitle')}
          message={t('messages.searchEmptyMessage')}
        />
      ) : searchQuery.isFetching ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          title={t('messages.searchNoResultsTitle')}
          message={t('messages.searchNoResultsMessage')}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.user_id}:${item.organization_id}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Button
              style={styles.row}
              disabled={Boolean(startingId)}
              onPress={() => void handleSelect(item)}
              accessibilityRole="button"
              variant="plain"
            >
              <View style={styles.avatar}>
                <AppText variant="cardTitle" style={styles.avatarLetter}>
                  {(item.full_name || '?').slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={styles.rowBody}>
                <AppText variant="cardTitle" numberOfLines={1}>
                  {item.full_name || t('messages.unknownUser')}
                </AppText>
                <AppText variant="caption" style={styles.meta} numberOfLines={1}>
                  {item.is_practitioner
                    ? t('messages.practitionerLabel')
                    : t('messages.patientLabel')}
                  {item.patient_id ? ` · ${item.patient_id}` : ''}
                  {item.organization_name ? ` · ${item.organization_name}` : ''}
                </AppText>
              </View>
              {startingId === item.user_id ? <ActivityIndicator color={palette.primary} /> : null}
            </Button>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  loading: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: palette.divider,
    marginLeft: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: palette.primaryDark,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  meta: {
    color: palette.textSecondary,
  },
});
