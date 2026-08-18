import { Platform } from 'react-native';

import { config } from '@/constants/env';
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
    isProductionAppEnv: false,
    admobBannerUnitIos: 'ca-app-pub-prod/ios-banner',
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
  const mockedConfig = config as { isProductionAppEnv: boolean; admobBannerUnitIos: string };

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    mockedConfig.isProductionAppEnv = false;
    (Platform as { OS: string }).OS = 'ios';
  });

  it('uses Google test banner unit in Metro (__DEV__)', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockedConfig.isProductionAppEnv = true;
    expect(getAdMobBannerUnitId('home.tips')).toBe(ADMOB_TEST_BANNER_UNIT);
  });

  it('uses Google test banner units on main / TestFlight (non-production app env)', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockedConfig.isProductionAppEnv = false;
    expect(getAdMobBannerUnitId('home.tips')).toBe(ADMOB_TEST_BANNER_UNIT);
    expect(getAdMobBannerUnitId('home.feed')).toBe(ADMOB_TEST_BANNER_UNIT);
  });

  it('uses the iOS banner unit for every slot on prod iOS', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockedConfig.isProductionAppEnv = true;
    (Platform as { OS: string }).OS = 'ios';
    expect(getAdMobBannerUnitId('home.tips')).toBe('ca-app-pub-prod/ios-banner');
    expect(getAdMobBannerUnitId('home.feed')).toBe('ca-app-pub-prod/ios-banner');
    expect(getAdMobBannerUnitId('learn.list')).toBe('ca-app-pub-prod/ios-banner');
  });

  it('reads Android production unit ids from per-slot env on prod Android', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockedConfig.isProductionAppEnv = true;
    (Platform as { OS: string }).OS = 'android';
    expect(getAdMobBannerUnitId('home.tips')).toBe('ca-app-pub-prod/home-tips');
    expect(getAdMobBannerUnitId('home.feed')).toBeNull();
    expect(getAdMobBannerUnitId('learn.list')).toBe('ca-app-pub-prod/learn');
  });

  it('returns null on prod iOS when the iOS banner unit is unset', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockedConfig.isProductionAppEnv = true;
    mockedConfig.admobBannerUnitIos = '  ';
    (Platform as { OS: string }).OS = 'ios';
    expect(getAdMobBannerUnitId('home.tips')).toBeNull();
    mockedConfig.admobBannerUnitIos = 'ca-app-pub-prod/ios-banner';
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
