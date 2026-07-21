import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock, ExternalLink, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  HEALTH_CATEGORIES,
} from '@/domains/articles/categories';
import { BookmarkToggleButton } from '@/domains/articles/components/BookmarkToggleButton';
import { ArticleReadBadge } from '@/domains/articles/components/ArticleReadBadge';
import { MarkAsReadToggleButton } from '@/domains/articles/components/MarkAsReadToggleButton';
import { isEvergreenArticle, isExternalArticle } from '@/domains/articles/utils/evergreen-articles';
import { palette, radius, shadow, spacing } from '@/theme';
import type { Article } from '@/types';

function getCategoryAccent(categoryId: string): string {
  return HEALTH_CATEGORIES.find((category) => category.id === categoryId)?.color ?? '#CBD5E1';
}

function getCategoryEmoji(categoryId: string): string {
  return HEALTH_CATEGORIES.find((category) => category.id === categoryId)?.emoji ?? '✨';
}

function ArticleThumbnail({
  article,
  height,
  width,
  featured = false,
  fill = false,
}: {
  article: Article;
  height?: number;
  width?: number | `${number}%`;
  featured?: boolean;
  /** Stretch to fill the parent (compact left column). */
  fill?: boolean;
}) {
  const fallbackColor = ARTICLE_THUMBNAILS[article.id] ?? getCategoryAccent(article.categoryId);
  const evergreen = isEvergreenArticle(article);
  const sizeStyle = fill ? styles.thumbFill : { height: height ?? 108, width: width ?? '100%' };

  if (article.imageUrl) {
    return <Image source={{ uri: article.imageUrl }} style={sizeStyle} contentFit="cover" />;
  }

  return (
    <LinearGradientFill
      colors={[
        { offset: '0%', color: fallbackColor },
        { offset: '100%', color: '#FFFFFF' },
      ]}
      angle={135}
      style={[
        sizeStyle,
        {
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <View style={styles.thumbBlob} />
      <View style={[styles.thumbIcon, featured ? styles.thumbIconFeatured : null]}>
        {evergreen ? (
          <Sparkles color={palette.primaryDark} size={featured ? 28 : 22} />
        ) : (
          <Text style={{ fontSize: featured ? 28 : 22 }}>
            {getCategoryEmoji(article.categoryId)}
          </Text>
        )}
      </View>
    </LinearGradientFill>
  );
}

function MetaPills({ article, showRead = true }: { article: Article; showRead?: boolean }) {
  const evergreen = isEvergreenArticle(article);
  const minutes = estimateReadingTime(article.content);

  return (
    <View style={styles.metaRow}>
      <View style={[styles.pill, evergreen ? styles.pillBrand : styles.pillNews]}>
        <AppText
          variant="caption"
          style={[styles.pillText, evergreen ? styles.pillBrandText : styles.pillNewsText]}
        >
          {evergreen ? 'CareMate' : 'News'}
        </AppText>
      </View>
      <View style={styles.pillMuted}>
        <AppText variant="caption" style={styles.pillMutedText} numberOfLines={1}>
          {article.categoryName}
        </AppText>
      </View>
      {showRead ? (
        <View style={styles.readPill}>
          <Clock color={palette.textSecondary} size={12} />
          <AppText variant="caption" style={styles.readText}>
            {minutes} min
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function FeaturedArticleCard({ article }: { article: Article }) {
  const external = isExternalArticle(article);

  return (
    <PressableScale
      style={[styles.featuredShell, shadow.card]}
      onPress={() => router.push(`/(app)/articles/${article.id}`)}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      <View style={styles.featuredMedia}>
        <ArticleThumbnail article={article} height={188} featured />
        <LinearGradientFill
          colors={[
            { offset: '0%', color: 'transparent', opacity: 0 },
            { offset: '100%', color: 'rgba(15, 23, 42, 0.55)', opacity: 1 },
          ]}
          angle={180}
          style={styles.featuredScrim}
        />
        <View style={styles.featuredBadges}>
          <MetaPills article={article} />
        </View>
      </View>
      <View style={styles.featuredBody}>
        <AppText variant="articleTitle" numberOfLines={2} style={styles.featuredTitle}>
          {article.title}
        </AppText>
        {article.summary ? (
          <AppText variant="articleDescription" numberOfLines={2} style={styles.featuredSummary}>
            {article.summary}
          </AppText>
        ) : null}
        <View style={styles.featuredFooter}>
          <AppText variant="caption" color="brand" style={styles.readCta}>
            Read article
          </AppText>
          <View style={styles.footerActions}>
            <ArticleReadBadge articleId={article.id} />
            {external ? <ExternalLink color={palette.textSecondary} size={16} /> : null}
            <MarkAsReadToggleButton articleId={article.id} size={16} />
            <BookmarkToggleButton articleId={article.id} size={16} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

export function CompactArticleCard({ article }: { article: Article }) {
  const external = isExternalArticle(article);
  const minutes = estimateReadingTime(article.content);
  const accent = getCategoryAccent(article.categoryId);

  return (
    <PressableScale
      style={[styles.compactShell, shadow.soft]}
      onPress={() => router.push(`/(app)/articles/${article.id}`)}
      accessibilityRole="button"
      accessibilityLabel={article.title}
    >
      <View style={styles.compactRow}>
        <View style={[styles.compactThumbWrap, { borderColor: `${accent}55` }]}>
          <ArticleThumbnail article={article} fill />
        </View>

        <View style={styles.compactBody}>
          <MetaPills article={article} showRead={false} />
          <AppText variant="providerName" numberOfLines={2} style={styles.compactTitle}>
            {article.title}
          </AppText>
          {article.summary ? (
            <AppText variant="providerMeta" numberOfLines={2} style={styles.compactSummary}>
              {article.summary}
            </AppText>
          ) : null}
          <View style={styles.compactFooter}>
            <View style={styles.readPill}>
              <Clock color={palette.textSecondary} size={12} />
              <AppText variant="caption" style={styles.readText}>
                {minutes} min read
              </AppText>
            </View>
            <View style={styles.footerActions}>
              <ArticleReadBadge articleId={article.id} />
              {external ? <ExternalLink color={palette.textSecondary} size={15} /> : null}
              <MarkAsReadToggleButton articleId={article.id} size={15} />
              <BookmarkToggleButton articleId={article.id} size={15} />
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
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
      <View style={styles.listStack}>
        {articles.map((article) => (
          <CompactArticleCard key={article.id} article={article} />
        ))}
      </View>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <View style={styles.listStack}>
      {featured ? <FeaturedArticleCard article={featured} /> : null}
      {rest.map((article) => (
        <CompactArticleCard key={article.id} article={article} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbFill: {
    ...StyleSheet.absoluteFill,
  },
  thumbBlob: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  thumbIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  thumbIconFeatured: {
    width: 64,
    height: 64,
    borderRadius: radius.xxl,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pillBrand: {
    backgroundColor: palette.primaryLight,
  },
  pillNews: {
    backgroundColor: palette.blueLight,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pillBrandText: {
    color: palette.primaryDark,
  },
  pillNewsText: {
    color: palette.brandBlue,
  },
  pillMuted: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: 120,
  },
  pillMutedText: {
    color: palette.text,
    fontSize: 11,
  },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  readText: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  featuredShell: {
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    overflow: 'hidden',
  },
  featuredMedia: {
    position: 'relative',
  },
  featuredScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  featuredBadges: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  featuredBody: {
    padding: spacing.md,
    gap: 8,
  },
  featuredTitle: {
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  featuredSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuredFooter: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readCta: {
    fontWeight: '600',
  },
  compactShell: {
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 124,
  },
  compactThumbWrap: {
    width: 108,
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRightWidth: 1,
    position: 'relative',
  },
  compactBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 7,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  compactSummary: {
    fontSize: 12,
    lineHeight: 17,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  listStack: {
    gap: 12,
  },
});
