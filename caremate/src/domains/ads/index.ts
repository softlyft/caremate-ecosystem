export { AD_SLOTS, AD_SLOT_IDS, DEFAULT_ADS_REMOTE_CONFIG } from '@/domains/ads/types';
export type {
  AdSlotId,
  AdSlotMode,
  AdSource,
  AdsRemoteConfig,
  ResolvedCatalogAd,
  ResolvedAdMobAd,
  ResolvedSlotAd,
  ResolvedAd,
} from '@/domains/ads/types';
export { adsRepository } from '@/domains/ads/repository';
export { getAdMobBannerUnitId, ADMOB_TEST_BANNER_UNIT } from '@/domains/ads/admob-config';
export {
  initializeAdsConsentAndSdk,
  isAdsConsentReady,
  canRequestAds,
  getAdMobRequestOptions,
} from '@/domains/ads/consent';
export {
  resolveAdForSlot,
  trackCatalogClick,
  trackCatalogImpression,
  trackAdMobClick,
  trackAdMobImpression,
  trackAdClick,
  trackAdImpression,
} from '@/domains/ads/resolver';
export { useAdForSlot } from '@/domains/ads/hooks';
