import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCheck } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { Box } from '@/components/ui/box';
import { EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { CompactArticleCard } from '@/domains/articles/components/ArticleCards';
import { articleRepository } from '@/domains/articles/repository';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { palette, radius, spacing } from '@/theme';
import type { ArticleReadStatus } from '@/types';

const READING_COLOR = palette.brandBlue;
const READ_COLOR = palette.primary;

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
        <TabIcon
          label={t('learn.readingTab')}
          active={tab === 'reading'}
          color={READING_COLOR}
          onPress={() => setTab('reading')}
          icon={BookOpen}
        />
        <TabIcon
          label={t('learn.readTab')}
          active={tab === 'read'}
          color={READ_COLOR}
          onPress={() => setTab('read')}
          icon={CheckCheck}
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

function TabIcon({
  label,
  active,
  color,
  onPress,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
  icon: typeof BookOpen;
}) {
  return (
    <Button
      onPress={onPress}
      style={[styles.chip, active ? { backgroundColor: `${color}18`, borderColor: color } : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      variant="plain"
    >
      <Icon color={active ? color : palette.textSecondary} size={20} strokeWidth={2.35} />
    </Button>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
