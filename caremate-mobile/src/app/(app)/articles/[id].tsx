import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Sparkles } from 'lucide-react-native';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { learnArticleHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { AD_SLOTS } from '@/domains/ads';
import { ARTICLE_THUMBNAILS, HEALTH_CATEGORIES } from '@/domains/articles/categories';
import { BookmarkToggleButton } from '@/domains/articles/components/BookmarkToggleButton';
import { ArticleShareButton } from '@/domains/articles/components/ArticleShareButton';
import { MarkAsReadToggleButton } from '@/domains/articles/components/MarkAsReadToggleButton';
import { useArticleReadTracking } from '@/domains/articles/hooks/use-article-read';
import { articleRepository } from '@/domains/articles/repository';
import { isEvergreenArticle, isExternalArticle } from '@/domains/articles/utils/evergreen-articles';
import { useTranslation } from '@/domains/localization';
import { AdSlot } from '@/features/ads/AdSlot';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

function getCategoryMeta(categoryId: string) {
  const match = HEALTH_CATEGORIES.find((category) => category.id === categoryId);
  return {
    color: match?.color ?? palette.primaryLight,
    emoji: match?.emoji ?? '✨',
  };
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function ArticleDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.articles, id],
    queryFn: () => articleRepository.findById(id),
    enabled: Boolean(id),
  });

  const article = query.data ?? null;
  const paragraphs = useMemo(() => (article ? splitParagraphs(article.content) : []), [article]);
  const { isRead, markRead } = useArticleReadTracking(id);
  const didAutoComplete = useRef(false);

  useLayoutEffect(() => {
    const shortTitle = article?.title
      ? article.title.length > 28
        ? `${article.title.slice(0, 28).trim()}…`
        : article.title
      : t('learn.article');
    navigation.setOptions(learnArticleHeaderOptions(shortTitle));
  }, [article?.title, navigation, t]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!article || isRead || didAutoComplete.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height <= 0) return;
    const progress = (contentOffset.y + layoutMeasurement.height) / Math.max(contentSize.height, 1);
    if (progress >= 0.88) {
      didAutoComplete.current = true;
      markRead();
    }
  }

  if (query.isLoading) {
    return <LoadingState title={t('learn.loadingArticle')} />;
  }

  if (!article) {
    return <ErrorState title={t('learn.notFound.title')} message={t('learn.notFound.message')} />;
  }

  const evergreen = isEvergreenArticle(article);
  const external = isExternalArticle(article);
  const category = getCategoryMeta(article.categoryId);
  const fallbackColor = ARTICLE_THUMBNAILS[article.id] ?? category.color;

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={200}
      >
        <AnimatedSection index={0}>
          <View style={[styles.heroShell, shadow.card]}>
            {article.imageUrl ? (
              <Image
                source={{ uri: article.imageUrl }}
                style={styles.heroImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradientFill
                colors={[
                  { offset: '0%', color: fallbackColor },
                  { offset: '100%', color: '#FFFFFF' },
                ]}
                angle={135}
                style={styles.heroFallback}
              >
                <View style={styles.heroBlob} />
                <View style={styles.heroIcon}>
                  {evergreen ? (
                    <Sparkles color={palette.primaryDark} size={32} />
                  ) : (
                    <Text style={{ fontSize: 32 }}>{category.emoji}</Text>
                  )}
                </View>
              </LinearGradientFill>
            )}
            <LinearGradientFill
              colors={[
                { offset: '0%', color: 'transparent', opacity: 0 },
                { offset: '100%', color: 'rgba(15, 23, 42, 0.55)', opacity: 1 },
              ]}
              angle={180}
              style={styles.heroScrim}
            />
            <View style={styles.heroBadges}>
              <View style={[styles.pill, evergreen ? styles.pillBrand : styles.pillNews]}>
                <AppText
                  variant="caption"
                  style={evergreen ? styles.pillBrandText : styles.pillNewsText}
                >
                  {evergreen ? t('learn.brand') : t('learn.news')}
                </AppText>
              </View>
              <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                <AppText variant="caption" style={styles.pillMutedText}>
                  {category.emoji} {article.categoryName}
                </AppText>
              </View>
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={styles.titleBlock}>
            <AppText variant="screenTitle" style={styles.title}>
              {article.title}
            </AppText>
            {article.summary ? (
              <AppText variant="subtitle" style={styles.summary}>
                {article.summary}
              </AppText>
            ) : null}
            <View style={styles.metaRow}>
              {external ? (
                <View style={styles.readPill}>
                  <ExternalLink color={palette.textSecondary} size={13} />
                  <AppText variant="caption" style={styles.readText}>
                    {t('learn.externalSource')}
                  </AppText>
                </View>
              ) : (
                <View style={[styles.readPill, { backgroundColor: palette.primaryLight }]}>
                  <Sparkles color={palette.primary} size={13} />
                  <AppText variant="caption" style={{ color: palette.primary }}>
                    {t('learn.careMateGuide')}
                  </AppText>
                </View>
              )}
              <ArticleShareButton article={article} size={15} style={styles.bookmarkBtn} />
              <MarkAsReadToggleButton articleId={article.id} size={15} style={styles.bookmarkBtn} />
              <BookmarkToggleButton articleId={article.id} size={15} style={styles.bookmarkBtn} />
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          <AdSlot slotId={AD_SLOTS.LEARN_ARTICLE_HEADER} />
        </AnimatedSection>

        <AnimatedSection index={3}>
          <View style={[styles.bodyCard, shadow.soft]}>
            <View style={styles.bodyAccent} />
            <View style={styles.bodyCopy}>
              {paragraphs.map((paragraph, index) => (
                <AppText
                  key={`${index}-${paragraph.slice(0, 12)}`}
                  variant="body"
                  style={styles.paragraph}
                >
                  {paragraph}
                </AppText>
              ))}
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <AdSlot slotId={AD_SLOTS.LEARN_ARTICLE_FOOTER} />
        </AnimatedSection>

        {article.sourceUrl ? (
          <AnimatedSection index={5}>
            <PressableScale
              style={[styles.cta, shadow.soft]}
              onPress={() => WebBrowser.openBrowserAsync(article.sourceUrl!)}
            >
              <ExternalLink color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.ctaLabel}>
                {t('learn.readFull')}
              </AppText>
            </PressableScale>
          </AnimatedSection>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    height: 220,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  heroBadges: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pillBrand: {
    backgroundColor: palette.primaryLight,
  },
  pillNews: {
    backgroundColor: palette.blueLight,
  },
  pillBrandText: {
    color: palette.primaryDark,
    fontWeight: '600',
    fontSize: 11,
  },
  pillNewsText: {
    color: palette.brandBlue,
    fontWeight: '600',
    fontSize: 11,
  },
  pillMutedText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 11,
  },
  titleBlock: {
    gap: 10,
  },
  title: {
    letterSpacing: -0.5,
    fontSize: 28,
    lineHeight: 34,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  bookmarkBtn: {
    marginLeft: 'auto',
  },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  readText: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  bodyCard: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bodyAccent: {
    width: 4,
    backgroundColor: palette.primary,
  },
  bodyCopy: {
    flex: 1,
    padding: layoutSpacing.cardPadding + 2,
    gap: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 28,
    color: palette.text,
  },
  cta: {
    minHeight: 54,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
});
