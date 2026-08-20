import { Platform } from 'react-native';

import type { AdSlotId } from '@/domains/ads/types';
import { config } from '@/constants/env';

/** Google sample adaptive banner unit — safe for development only. */
export const ADMOB_TEST_BANNER_UNIT = 'ca-app-pub-3940256099942544/9214589741';

const SLOT_ENV_KEYS: Record<AdSlotId, keyof typeof config> = {
  'home.tips': 'admobBannerHomeTips',
  'home.feed': 'admobBannerHomeFeed',
  'learn.list': 'admobBannerLearnList',
  'learn.article_header': 'admobBannerLearnArticleHeader',
  'learn.article_footer': 'admobBannerLearnArticleFooter',
  'nearby.list': 'admobBannerNearbyList',
  'nearby.provider': 'admobBannerNearbyProvider',
  'pregnancy.timeline': 'admobBannerPregnancyTimeline',
  'pregnancy.footer': 'admobBannerPregnancyFooter',
  'period.week': 'admobBannerPeriodWeek',
  'period.footer': 'admobBannerPeriodFooter',
};

/**
 * Banner unit ID for a slot.
 * Metro (`__DEV__`) and non-production binaries (`main` TestFlight / sideload APK)
 * always use Google sample IDs. Live units are only used when `EXPO_PUBLIC_APP_ENV=production`.
 */
export function getAdMobBannerUnitId(slotId: AdSlotId): string | null {
  if (__DEV__ || !config.isProductionAppEnv) {
    return ADMOB_TEST_BANNER_UNIT;
  }

  if (Platform.OS === 'ios') {
    const iosUnit = config.admobBannerUnitIos.trim();
    return iosUnit || null;
  }

  const key = SLOT_ENV_KEYS[slotId];
  const value = config[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return null;
}
