import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bookmark, Clock, ExternalLink, Sparkles } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  HEALTH_CATEGORIES,
} from '@/domains/articles/categories';
import { isEvergreenArticle, isExternalArticle } from '@/domains/articles/utils/evergreen-articles';
import { palette } from '@/theme';
import type { Article } from '@/types';

function getCategoryAccent(categoryId: string): string {
  return HEALTH_CATEGORIES.find((category) => category.id === categoryId)?.color ?? '#CBD5E1';
}

function ArticleThumbnail({
  article,
  className,
  height,
  width,
}: {
  article: Article;
  className?: string;
  height: number;
  width?: number | `${number}%`;
}) {
  const fallbackColor = ARTICLE_THUMBNAILS[article.id] ?? getCategoryAccent(article.categoryId);

  if (article.imageUrl) {
    return (
      <Image
        source={{ uri: article.imageUrl }}
        style={{ height, width: width ?? '100%' }}
        className={className}
        contentFit="cover"
      />
    );
  }

  return (
    <Box
      className={`items-center justify-center ${className ?? ''}`}
      style={{ height, width: width ?? '100%', backgroundColor: fallbackColor }}
    >
      {isEvergreenArticle(article) ? <Sparkles color={palette.primaryDark} size={28} /> : null}
    </Box>
  );
}

function SourceBadge({ article }: { article: Article }) {
  const evergreen = isEvergreenArticle(article);

  return (
    <Badge variant={evergreen ? 'default' : 'secondary'} className="rounded-full px-2.5 py-1">
      <BadgeText className="normal-case tracking-normal text-[11px]">
        {evergreen ? 'CareMate' : 'News'}
      </BadgeText>
    </Badge>
  );
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="rounded-full px-2.5 py-1 bg-background/80">
      <BadgeText className="normal-case tracking-normal text-[11px]">{name}</BadgeText>
    </Badge>
  );
}

function ArticleMeta({ article }: { article: Article }) {
  const external = isExternalArticle(article);

  return (
    <HStack className="items-center justify-between mt-1">
      <HStack space="xs" className="items-center">
        <Clock color={palette.textSecondary} size={14} />
        <Text size="xs" className="text-muted-foreground font-medium">
          {estimateReadingTime(article.content)} min read
        </Text>
      </HStack>
      {external ? (
        <ExternalLink color={palette.textSecondary} size={16} />
      ) : (
        <Bookmark color={palette.textSecondary} size={16} />
      )}
    </HStack>
  );
}

export function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <Pressable
      onPress={() => router.push(`/(app)/articles/${article.id}`)}
      className="active:opacity-90"
    >
      <Card className="p-0 gap-0 overflow-hidden rounded-2xl border-primary/15 shadow-sm">
        <Box className="relative">
          <ArticleThumbnail article={article} height={176} />
          <HStack space="sm" className="absolute left-3 bottom-3 flex-wrap">
            <SourceBadge article={article} />
            <CategoryBadge name={article.categoryName} />
          </HStack>
        </Box>
        <VStack className="p-4 gap-2">
          <Heading size="md" className="text-foreground leading-6" numberOfLines={2}>
            {article.title}
          </Heading>
          {article.summary ? (
            <Text size="sm" className="text-muted-foreground leading-5" numberOfLines={3}>
              {article.summary}
            </Text>
          ) : null}
          <ArticleMeta article={article} />
        </VStack>
      </Card>
    </Pressable>
  );
}

export function CompactArticleCard({ article }: { article: Article }) {
  return (
    <Pressable
      onPress={() => router.push(`/(app)/articles/${article.id}`)}
      className="active:opacity-90"
    >
      <Card className="p-3 gap-0 overflow-hidden rounded-2xl">
        <HStack space="md" className="items-stretch">
          <Box className="overflow-hidden rounded-xl">
            <ArticleThumbnail article={article} height={96} width={96} />
          </Box>
          <VStack className="flex-1 gap-1.5 justify-between py-0.5">
            <VStack className="gap-1.5">
              <HStack space="xs" className="flex-wrap">
                <SourceBadge article={article} />
                <CategoryBadge name={article.categoryName} />
              </HStack>
              <Heading size="sm" className="text-foreground leading-5" numberOfLines={2}>
                {article.title}
              </Heading>
            </VStack>
            <ArticleMeta article={article} />
          </VStack>
        </HStack>
      </Card>
    </Pressable>
  );
}

interface ArticleCardListProps {
  articles: Article[];
  featureFirst?: boolean;
}

/** Renders the first article as featured (optional) and the rest as compact cards. */
export function ArticleCardList({ articles, featureFirst = true }: ArticleCardListProps) {
  if (articles.length === 0) {
    return null;
  }

  if (!featureFirst) {
    return (
      <VStack space="md">
        {articles.map((article) => (
          <CompactArticleCard key={article.id} article={article} />
        ))}
      </VStack>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <VStack space="md">
      {featured ? <FeaturedArticleCard article={featured} /> : null}
      {rest.map((article) => (
        <CompactArticleCard key={article.id} article={article} />
      ))}
    </VStack>
  );
}
