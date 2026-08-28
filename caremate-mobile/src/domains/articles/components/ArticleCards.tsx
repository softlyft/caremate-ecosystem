import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { Button } from '@/components/ui/form-controls';
import { AppText } from '@/components/ui/AppText';
import { ARTICLE_THUMBNAILS, getHealthCategory } from '@/domains/articles/categories';
import { ArticleShareButton } from '@/domains/articles/components/ArticleShareButton';
import { BookmarkToggleButton } from '@/domains/articles/components/BookmarkToggleButton';
import { MarkAsReadToggleButton } from '@/domains/articles/components/MarkAsReadToggleButton';
import { isEvergreenArticle } from '@/domains/articles/utils/evergreen-articles';
import { palette, primaryAlpha, radius, shadow, spacing } from '@/theme';
import type { Article } from '@/types';

function getCategoryAccent(categoryId: string): string {
  return getHealthCategory(categoryId)?.color ?? '#CBD5E1';
}

function getCategoryEmoji(categoryId: string): string {
  return getHealthCategory(categoryId)?.emoji ?? '✨';
}

function getCategoryDisplayName(article: Article): string {
  return getHealthCategory(article.categoryId)?.name ?? article.categoryName;
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

function MetaPills({ article }: { article: Article }) {
  const evergreen = isEvergreenArticle(article);

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
          {getCategoryDisplayName(article)}
        </AppText>
      </View>
    </View>
  );
}

export function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <View style={[styles.featuredShell, shadow.card]}>
      <Button
        style={styles.featuredPress}
        onPress={() => router.push(`/(app)/articles/${article.id}`)}
        accessibilityLabel={article.title}
        variant="plain"
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
          <AppText variant="caption" color="brand" style={styles.readCta}>
            Read article
          </AppText>
        </View>
      </Button>
      <View style={styles.featuredActions}>
        <ArticleShareButton article={article} size={16} />
        <MarkAsReadToggleButton articleId={article.id} size={16} />
        <BookmarkToggleButton articleId={article.id} size={16} />
      </View>
    </View>
  );
}

export function CompactArticleCard({ article }: { article: Article }) {
  const accent = getCategoryAccent(article.categoryId);

  return (
    <View style={[styles.compactShell, shadow.soft]}>
      <Button
        style={styles.compactPress}
        onPress={() => router.push(`/(app)/articles/${article.id}`)}
        accessibilityLabel={article.title}
        variant="plain"
      >
        <View style={styles.compactRow}>
          <View style={[styles.compactThumbWrap, { borderColor: `${accent}55` }]}>
            <ArticleThumbnail article={article} fill />
          </View>

          <View style={styles.compactBody}>
            <MetaPills article={article} />
            <AppText variant="providerName" numberOfLines={2} style={styles.compactTitle}>
              {article.title}
            </AppText>
            {article.summary ? (
              <AppText variant="providerMeta" numberOfLines={2} style={styles.compactSummary}>
                {article.summary}
              </AppText>
            ) : null}
          </View>
        </View>
      </Button>
      <View style={styles.compactActions}>
        <ArticleShareButton article={article} size={15} />
        <MarkAsReadToggleButton articleId={article.id} size={15} />
        <BookmarkToggleButton articleId={article.id} size={15} />
      </View>
    </View>
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
  featuredShell: {
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: primaryAlpha(0.12),
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
  featuredPress: {
    alignItems: 'stretch',
  },
  featuredBody: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
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
  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  readCta: {
    fontWeight: '600',
    marginTop: 4,
  },
  compactShell: {
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  compactPress: {
    alignItems: 'stretch',
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
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  listStack: {
    gap: 12,
  },
});
