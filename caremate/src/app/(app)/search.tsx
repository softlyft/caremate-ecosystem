import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  MapPin,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { formatProviderType } from '@/domains/providers/types';
import { normalizeSearchQuery, runGlobalSearch } from '@/domains/search';
import { getMiniAppLabel } from '@/mini-apps/_kit/registry';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';
import { fontFamily, textColors } from '@/theme/typography';

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const userKey = isGuest ? 'guest' : userId;
  const normalized = normalizeSearchQuery(deferredQuery);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const searchQuery = useQuery({
    queryKey: [...QUERY_KEYS.search, normalized, userKey],
    queryFn: () => runGlobalSearch(normalized, userKey),
    enabled: normalized.length > 0,
  });

  const results = searchQuery.data;
  const hasQuery = normalized.length > 0;
  const isEmpty =
    hasQuery &&
    !searchQuery.isFetching &&
    results &&
    results.articles.length === 0 &&
    results.providers.length === 0 &&
    results.tools.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <ArrowLeft color={palette.text} size={22} />
        </Pressable>
        <View style={styles.searchField}>
          <Search color={textColors.placeholder} size={18} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search articles, providers, tools..."
            placeholderTextColor={textColors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <X color={textColors.placeholder} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {!hasQuery ? (
          <EmptyState
            title="Search CareMate"
            message="Find health articles, nearby providers, and health tools."
          />
        ) : null}

        {hasQuery && searchQuery.isFetching && !results ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : null}

        {hasQuery && searchQuery.isError && !results ? (
          <ErrorState
            title={t('common.loadFailed')}
            message={
              searchQuery.error instanceof Error
                ? searchQuery.error.message
                : t('common.loadFailedMessage')
            }
            actionLabel={t('common.retry')}
            onAction={() => {
              void searchQuery.refetch();
            }}
          />
        ) : null}

        {isEmpty ? (
          <EmptyState title="No results" message="Try another keyword or check spelling." />
        ) : null}

        {results && results.articles.length > 0 ? (
          <Section title="Articles" icon={BookOpen}>
            {results.articles.map((article) => (
              <Pressable
                key={article.id}
                style={styles.row}
                onPress={() => router.push(`/(app)/articles/${article.id}`)}
              >
                <AppText variant="cardTitle">{article.title}</AppText>
                {article.summary ? (
                  <AppText variant="caption" numberOfLines={2}>
                    {article.summary}
                  </AppText>
                ) : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/articles',
                  params: { q: results.query },
                })
              }
            >
              <AppText variant="seeAll">See all in Learn</AppText>
            </Pressable>
          </Section>
        ) : null}

        {results && results.providers.length > 0 ? (
          <Section title="Nearby" icon={MapPin}>
            {results.providers.map((provider) => (
              <Pressable
                key={provider.id}
                style={styles.row}
                onPress={() => router.push(`/(app)/providers/${provider.id}`)}
              >
                <AppText variant="providerName">{provider.name}</AppText>
                <AppText variant="providerMeta">{formatProviderType(provider.type)}</AppText>
                {provider.address ? (
                  <AppText variant="caption" numberOfLines={1}>
                    {provider.address}
                  </AppText>
                ) : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/providers',
                  params: { q: results.query },
                })
              }
            >
              <AppText variant="seeAll">See all in Nearby</AppText>
            </Pressable>
          </Section>
        ) : null}

        {results && results.tools.length > 0 ? (
          <Section title="Tools" icon={LayoutGrid}>
            {results.tools.map((tool) => {
              const Icon = tool.icon;
              const { name, description } = getMiniAppLabel(tool.id, t);
              return (
                <Pressable key={tool.id} style={styles.row} onPress={() => router.push(tool.route)}>
                  <View style={styles.toolRow}>
                    <View style={[styles.toolIcon, { backgroundColor: tool.backgroundColor }]}>
                      <Icon color={tool.color} size={18} />
                    </View>
                    <View style={styles.toolCopy}>
                      <AppText variant="cardTitle">{name}</AppText>
                      <AppText variant="caption" numberOfLines={2}>
                        {description}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Section>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon color={palette.primary} size={18} />
        <AppText variant="sectionTitle">{title}</AppText>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: palette.text,
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  toolRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    gap: 2,
  },
});
