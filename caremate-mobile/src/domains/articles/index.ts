export { articleRepository } from '@/domains/articles/repository';
export {
  ArticleCardList,
  CompactArticleCard,
  FeaturedArticleCard,
} from '@/domains/articles/components/ArticleCards';
export { BookmarkToggleButton } from '@/domains/articles/components/BookmarkToggleButton';
export { MarkAsReadToggleButton } from '@/domains/articles/components/MarkAsReadToggleButton';
export { ArticleReadBadge } from '@/domains/articles/components/ArticleReadBadge';
export { useArticleBookmark } from '@/domains/articles/hooks/use-article-bookmark';
export {
  useArticleReadStatus,
  useArticleReadTracking,
} from '@/domains/articles/hooks/use-article-read';
export {
  ARTICLE_THUMBNAILS,
  estimateReadingTime,
  HEALTH_CATEGORIES,
} from '@/domains/articles/categories';
export {
  formatLearnContentType,
  isLearnContentType,
  LEARN_CONTENT_TYPE_LABELS,
  LEARN_CONTENT_TYPES,
  PRIMARY_LEARN_CONTENT_TYPES,
  type LearnContentAttributes,
  type LearnContentType,
} from '@/domains/articles/content-types';
export {
  articleMatchesNewsRegion,
  EXTERNAL_NEWS_RETENTION_DAYS,
  getFirstSeenAt,
  getNewsRegions,
  HOME_TRENDING_COUNTRY_SLOTS,
  HOME_TRENDING_INT_SLOTS,
  HOME_TRENDING_MAX_ITEMS,
  isEvergreenArticle,
  isExternalArticle,
  isWithinExternalNewsRetention,
  LEARN_CATEGORIES,
  mergeNewsRegions,
  orderLearnFeed,
  orderTrendingFeed,
} from '@/domains/articles/utils/evergreen-articles';
