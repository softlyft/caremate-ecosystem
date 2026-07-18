import {
  canRequestAds,
  getAdMobRequestOptions,
  initializeAdsConsentAndSdk,
  isAdsConsentReady,
  resetAdsConsentStateForTests,
  shouldReloadBannerOnForeground,
} from '@/domains/ads/consent';
import { getAdMobBannerUnitId, ADMOB_TEST_BANNER_UNIT } from '@/domains/ads/admob-config';

jest.mock('@/constants/env', () => ({
  config: {
    admobBannerHomeTips: '  ca-app-pub-prod/home-tips  ',
    admobBannerHomeFeed: '',
    admobBannerLearnList: 'ca-app-pub-prod/learn',
    admobBannerLearnArticleHeader: '',
    admobBannerLearnArticleFooter: '',
    admobBannerNearbyList: '',
    admobBannerNearbyProvider: '',
    admobBannerPregnancyTimeline: '',
    admobBannerPregnancyFooter: '',
    admobBannerPeriodWeek: '',
    admobBannerPeriodFooter: '',
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockGatherConsent = jest.fn();
const mockInitialize = jest.fn();

jest.mock('react-native-google-mobile-ads', () => ({
  AdsConsent: {
    gatherConsent: (...args: unknown[]) => mockGatherConsent(...args),
  },
  default: () => ({
    initialize: (...args: unknown[]) => mockInitialize(...args),
  }),
}));

describe('admob config', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it('uses Google test banner unit in development', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expect(getAdMobBannerUnitId('home.tips')).toBe(ADMOB_TEST_BANNER_UNIT);
  });

  it('reads production unit ids from env when not in dev', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(getAdMobBannerUnitId('home.tips')).toBe('ca-app-pub-prod/home-tips');
    expect(getAdMobBannerUnitId('home.feed')).toBeNull();
    expect(getAdMobBannerUnitId('learn.list')).toBe('ca-app-pub-prod/learn');
  });
});

describe('ads consent helpers', () => {
  beforeEach(() => {
    resetAdsConsentStateForTests();
    mockGatherConsent.mockReset();
    mockInitialize.mockReset();
  });

  it('returns non-personalized request options', () => {
    expect(getAdMobRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it('reloads banners on iOS foreground', () => {
    expect(shouldReloadBannerOnForeground()).toBe(true);
  });

  it('reports consent not ready until initialized', async () => {
    expect(isAdsConsentReady()).toBe(false);
    await expect(canRequestAds()).resolves.toBe(false);
  });

  it('initializes Mobile Ads when consent allows requests', async () => {
    mockGatherConsent.mockResolvedValue({ canRequestAds: true });
    mockInitialize.mockResolvedValue(undefined);

    await initializeAdsConsentAndSdk();
    expect(isAdsConsentReady()).toBe(true);
    await expect(canRequestAds()).resolves.toBe(true);
    expect(mockInitialize).toHaveBeenCalled();

    // Second call is a no-op once ready.
    await initializeAdsConsentAndSdk();
    expect(isAdsConsentReady()).toBe(true);
  });

  it('marks consent ready even when gatherConsent fails', async () => {
    mockGatherConsent.mockRejectedValue(new Error('ump failed'));
    await initializeAdsConsentAndSdk();
    expect(isAdsConsentReady()).toBe(true);
    await expect(canRequestAds()).resolves.toBe(false);
  });
});
