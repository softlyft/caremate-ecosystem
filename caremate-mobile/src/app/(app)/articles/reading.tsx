import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { Box } from '@/components/ui/box';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { CompactArticleCard } from '@/domains/articles/components/ArticleCards';
import { articleRepository } from '@/domains/articles/repository';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { palette, radius, spacing } from '@/theme';
import type { ArticleReadStatus } from '@/types';

export default function ReadingHistoryScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const [tab, setTab] = useState<ArticleReadStatus>('reading');

  const query = useQuery({
    queryKey: [...QUERY_KEYS.articleReads, tab, userId],
    queryFn: () => articleRepository.getArticlesByReadStatus(userId, tab),
  });

  if (query.isLoading) {
    return <LoadingState title={t('learn.loadingReading')} />;
  }

  const articles = query.data ?? [];

  return (
    <Screen>
      <View style={styles.tabs}>
        <TabChip
          label={t('learn.readingTab')}
          active={tab === 'reading'}
          onPress={() => setTab('reading')}
        />
        <TabChip
          label={t('learn.readTab')}
          active={tab === 'read'}
          onPress={() => setTab('read')}
        />
      </View>

      {articles.length === 0 ? (
        <EmptyState
          title={tab === 'reading' ? t('learn.readingEmpty.title') : t('learn.readEmpty.title')}
          message={
            tab === 'reading' ? t('learn.readingEmpty.message') : t('learn.readEmpty.message')
          }
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CompactArticleCard article={item} />}
          ItemSeparatorComponent={() => <Box className="h-3" />}
        />
      )}
    </Screen>
  );
}

function TabChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <AppText variant="body" style={active ? styles.chipTextActive : styles.chipText}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: palette.surface,
  },
  chipActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextActive: {
    color: palette.primary,
    fontWeight: '600',
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
