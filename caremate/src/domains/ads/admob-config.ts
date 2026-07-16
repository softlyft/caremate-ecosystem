import type { AdSlotId } from '@/domains/ads/types';
import { config } from '@/constants/env';

/** Google sample banner unit — safe for development only. */
export const ADMOB_TEST_BANNER_UNIT = 'ca-app-pub-3940256099942544/6300978111';

const SLOT_ENV_KEYS: Record<AdSlotId, keyof typeof config> = {
  'home.tips': 'admobBannerHomeTips',
  'home.feed': 'admobBannerHomeFeed',
  'learn.list': 'admobBannerLearnList',
  'learn.article_header': 'admobBannerLearnArticleHeader',
  'learn.article_footer': 'admobBannerLearnArticleFooter',
  'nearby.list': 'admobBannerNearbyList',
  'nearby.provider': 'admobBannerNearbyProvider',
};

/** Banner unit ID for a slot. Dev builds always use Google test IDs. */
export function getAdMobBannerUnitId(slotId: AdSlotId): string | null {
  if (__DEV__) {
    return ADMOB_TEST_BANNER_UNIT;
  }

  const key = SLOT_ENV_KEYS[slotId];
  const value = config[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
}
