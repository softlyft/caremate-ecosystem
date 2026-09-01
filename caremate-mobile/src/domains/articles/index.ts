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
  getHealthCategory,
  getHealthCategoryName,
  getHealthCategoryShortLabel,
  HEALTH_CATEGORIES,
  healthCategoryIdsForQuery,
  isHealthCategoryId,
  LEGACY_HEALTH_CATEGORY_ID_MAP,
  normalizeHealthCategoryId,
  type HealthCategory,
  type HealthCategoryId,
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
  shouldEvictExternalNewsFromDevice,
  LEARN_CATEGORIES,
  mergeNewsRegions,
  orderLearnFeed,
  orderTrendingFeed,
} from '@/domains/articles/utils/evergreen-articles';
export {
  buildArticleShareContent,
  buildArticleShareUrl,
  parseArticleIdFromShareUrl,
} from '@/domains/articles/share';
export { ArticleShareButton } from '@/domains/articles/components/ArticleShareButton';
