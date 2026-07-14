import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { articleRepository } from '@/domains/articles/repository';
import { radius, spacing } from '@/theme/colors';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.articles, id],
    queryFn: () => articleRepository.findById(id),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return <LoadingState title="Loading article..." />;
  }

  if (!query.data) {
    return <ErrorState title="Article not found" message="This article may have been removed." />;
  }

  const article = query.data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {article.imageUrl ? (
          <Image source={{ uri: article.imageUrl }} style={styles.hero} contentFit="cover" />
        ) : null}
        <AppText variant="badge" style={styles.category}>
          {article.categoryName}
        </AppText>
        <AppText variant="screenTitle">{article.title}</AppText>
        {article.summary ? <AppText variant="subtitle">{article.summary}</AppText> : null}
        <AppText variant="body" style={styles.body}>
          {article.content}
        </AppText>
        {article.sourceUrl ? (
          <View style={styles.actions}>
            <Button
              label="Read full article"
              onPress={() => WebBrowser.openBrowserAsync(article.sourceUrl!)}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    width: '100%',
    height: 180,
    borderRadius: radius.xl,
  },
  category: {
    textTransform: 'uppercase',
  },
  body: {
    lineHeight: 26,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
