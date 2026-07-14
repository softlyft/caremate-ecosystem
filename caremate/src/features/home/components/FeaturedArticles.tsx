import { router } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { ArticleCardList } from '@/domains/articles/components/ArticleCards';
import type { Article } from '@/types';

interface FeaturedArticlesProps {
  articles: Article[];
}

export function FeaturedArticles({ articles }: FeaturedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <Box className="px-4 mb-6">
      <HStack className="items-center justify-between mb-3">
        <Heading size="md" className="text-foreground">
          Trending Today
        </Heading>
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/articles')}
          className="active:opacity-70"
        >
          <Text size="sm" bold className="text-primary">
            See All
          </Text>
        </Pressable>
      </HStack>

      <ArticleCardList articles={articles} featureFirst />
    </Box>
  );
}
