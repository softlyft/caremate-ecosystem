import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { SectionHeader } from '@/components/motion/SectionHeader';
import { ArticleCardList } from '@/domains/articles/components/ArticleCards';
import { useTranslation } from '@/domains/localization';
import type { Article } from '@/types';
import { layoutSpacing } from '@/theme';

interface FeaturedArticlesProps {
  articles: Article[];
}

export function FeaturedArticles({ articles }: FeaturedArticlesProps) {
  const { t } = useTranslation();

  if (articles.length === 0) {
    return null;
  }

  return (
    <AnimatedSection index={5} style={styles.section}>
      <SectionHeader
        title={t('home.featuredArticles.title')}
        subtitle={t('home.featuredArticles.subtitle')}
        onSeeAll={() => router.push('/(app)/(tabs)/articles')}
      />
      <View style={styles.list}>
        <ArticleCardList articles={articles} featureFirst />
      </View>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
  },
});
