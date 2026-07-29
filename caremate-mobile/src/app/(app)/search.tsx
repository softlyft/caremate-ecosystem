import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  ChevronLeft,
  LayoutGrid,
  MapPin,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { CompactArticleCard } from '@/domains/articles/components/ArticleCards';
import { useTranslation } from '@/domains/localization';
import { NearbyProviderCard } from '@/domains/providers/components/NearbyProviderCard';
import { normalizeSearchQuery, runGlobalSearch } from '@/domains/search';
import { getMiniAppLabel } from '@/mini-apps/_kit/registry';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';
import { textColors } from '@/theme/typography';

const ACCENT = palette.primary;
const SOFT = palette.primaryLight;

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
      <View style={styles.meshTop} pointerEvents="none" />
      <View style={styles.meshAccent} pointerEvents="none" />

      <View style={styles.header}>
        <Button
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
          onPress={() => router.back()}
          style={[styles.backButton, shadow.soft]}
          scale={0.94}
          hitSlop={8} variant="plain">
          <ChevronLeft color={ACCENT} size={22} strokeWidth={2.4} />
        </Button>

        <View style={[styles.searchShell, shadow.soft]}>
          <View style={styles.searchIcon}>
            <Search color={ACCENT} size={16} strokeWidth={2.5} />
          </View>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={textColors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel={t('common.search')}
          />
          {query.length > 0 ? (
            <Button
              accessibilityRole="button"
              accessibilityLabel={t('search.clearA11y')}
              onPress={() => setQuery('')}
              style={styles.clearButton}
              hitSlop={8}
              scale={0.92} variant="plain">
              <X color={palette.textSecondary} size={16} strokeWidth={2.4} />
            </Button>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {!hasQuery ? (
          <AnimatedSection index={0}>
            <View style={[styles.idleCard, shadow.soft]}>
              <View style={styles.idleIconRing}>
                <Search color={ACCENT} size={22} strokeWidth={2.25} />
              </View>
              <AppText variant="cardTitle" style={styles.idleTitle}>
                {t('search.idle.title')}
              </AppText>
              <AppText variant="subtitle" style={styles.idleMessage}>
                {t('search.idle.message')}
              </AppText>
              <View style={styles.hintRow}>
                <HintChip icon={BookOpen} label={t('search.hintArticles')} />
                <HintChip icon={MapPin} label={t('search.hintNearby')} />
                <HintChip icon={LayoutGrid} label={t('search.hintTools')} />
              </View>
            </View>
          </AnimatedSection>
        ) : null}

        {hasQuery && searchQuery.isFetching && !results ? (
          <LoadingState title={t('search.loading')} />
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
          <AnimatedSection index={0}>
            <EmptyState title={t('search.empty.title')} message={t('search.empty.message')} />
          </AnimatedSection>
        ) : null}

        {results && results.articles.length > 0 ? (
          <AnimatedSection index={0}>
            <Section title={t('search.sections.articles')} icon={BookOpen}>
              {results.articles.map((article) => (
                <CompactArticleCard key={article.id} article={article} />
              ))}
              <Button
                onPress={() =>
                  router.push({
                    pathname: '/(app)/(tabs)/articles',
                    params: { q: results.query },
                  })
                }
                style={styles.seeAll}
                scale={0.97} variant="plain">
                <AppText variant="seeAll" color="brand">
                  {t('search.seeAllLearn')}
                </AppText>
              </Button>
            </Section>
          </AnimatedSection>
        ) : null}

        {results && results.providers.length > 0 ? (
          <AnimatedSection index={1}>
            <Section title={t('search.sections.nearby')} icon={MapPin}>
              {results.providers.map((provider) => (
                <NearbyProviderCard
                  key={provider.id}
                  provider={provider}
                  onPress={() => router.push(`/(app)/providers/${provider.id}`)}
                />
              ))}
              <Button
                onPress={() =>
                  router.push({
                    pathname: '/(app)/(tabs)/providers',
                    params: { q: results.query },
                  })
                }
                style={styles.seeAll}
                scale={0.97} variant="plain">
                <AppText variant="seeAll" color="brand">
                  {t('search.seeAllNearby')}
                </AppText>
              </Button>
            </Section>
          </AnimatedSection>
        ) : null}

        {results && results.tools.length > 0 ? (
          <AnimatedSection index={2}>
            <Section title={t('search.sections.tools')} icon={LayoutGrid}>
              {results.tools.map((tool) => {
                const Icon = tool.icon;
                const { name, description } = getMiniAppLabel(tool.id, t);
                return (
                  <Button
                    key={tool.id}
                    style={[styles.toolCard, shadow.soft]}
                    onPress={() => router.push(tool.route)}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    scale={0.98} variant="plain">
                    <View style={[styles.toolIcon, { backgroundColor: tool.backgroundColor }]}>
                      <Icon color={tool.color} size={18} strokeWidth={2.25} />
                    </View>
                    <View style={styles.toolCopy}>
                      <AppText variant="cardTitle">{name}</AppText>
                      <AppText variant="caption" numberOfLines={2} style={styles.toolDescription}>
                        {description}
                      </AppText>
                    </View>
                  </Button>
                );
              })}
            </Section>
          </AnimatedSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HintChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={styles.hintChip}>
      <Icon color={ACCENT} size={13} strokeWidth={2.25} />
      <AppText variant="caption" style={styles.hintChipText}>
        {label}
      </AppText>
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
        <View style={styles.sectionIcon}>
          <Icon color={ACCENT} size={15} strokeWidth={2.4} />
        </View>
        <AppText variant="sectionTitle" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  meshTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: SOFT,
    opacity: 0.55,
  },
  meshAccent: {
    position: 'absolute',
    top: 80,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: `${ACCENT}33`,
  },
  searchShell: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: palette.text,
    paddingVertical: 6,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  idleCard: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.1)',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  idleIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: `${ACCENT}28`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  idleTitle: {
    textAlign: 'center',
    color: palette.primaryDark,
  },
  idleMessage: {
    textAlign: 'center',
    color: palette.textSecondary,
  },
  hintRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: `${ACCENT}22`,
  },
  hintChipText: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: palette.primaryDark,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  seeAll: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    gap: 3,
  },
  toolDescription: {
    color: palette.textSecondary,
  },
});
