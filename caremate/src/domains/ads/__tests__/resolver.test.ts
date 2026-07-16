import { resolveAdForSlot } from '@/domains/ads/resolver';
import { AD_SLOTS } from '@/domains/ads/types';

const mockGetRemoteConfig = jest.fn();
const mockListEligibleForSlot = jest.fn();
const mockCountImpressionsToday = jest.fn();
const mockGetCachedPremiumState = jest.fn();
const mockIsOnline = jest.fn();
const mockIsAdsConsentReady = jest.fn();
const mockCanRequestAds = jest.fn();
const mockGetAdMobBannerUnitId = jest.fn();
const mockGetDeviceDefaults = jest.fn();

jest.mock('@/domains/ads/repository', () => ({
  adsRepository: {
    getRemoteConfig: (...args: unknown[]) => mockGetRemoteConfig(...args),
    listEligibleForSlot: (...args: unknown[]) => mockListEligibleForSlot(...args),
    countImpressionsToday: (...args: unknown[]) => mockCountImpressionsToday(...args),
  },
}));

jest.mock('@/domains/billing/repository', () => ({
  billingRepository: {
    getCachedPremiumState: (...args: unknown[]) => mockGetCachedPremiumState(...args),
  },
}));

jest.mock('@/sync/network', () => ({
  isOnline: (...args: unknown[]) => mockIsOnline(...args),
}));

jest.mock('@/domains/ads/consent', () => ({
  isAdsConsentReady: (...args: unknown[]) => mockIsAdsConsentReady(...args),
  canRequestAds: (...args: unknown[]) => mockCanRequestAds(...args),
}));

jest.mock('@/domains/ads/admob-config', () => ({
  getAdMobBannerUnitId: (...args: unknown[]) => mockGetAdMobBannerUnitId(...args),
}));

jest.mock('@/domains/onboarding', () => ({
  getDeviceDefaults: (...args: unknown[]) => mockGetDeviceDefaults(...args),
}));

const slotId = AD_SLOTS.HOME_FEED;

const baseRemote = {
  adsEnabled: true,
  slotMode: {
    'home.tips': 'house' as const,
    'home.feed': 'house' as const,
    'learn.list': 'house' as const,
    'learn.article_header': 'house' as const,
    'learn.article_footer': 'house' as const,
    'nearby.list': 'house' as const,
    'nearby.provider': 'house' as const,
  },
};

const catalogItem = {
  campaignId: 'camp-1',
  creativeId: 'creative-1',
  source: 'house' as const,
  priority: 10,
  frequencyCapPerDay: 6,
  countryCodes: [] as string[],
  title: 'Title',
  body: 'Body',
  ctaLabel: null,
  ctaHref: null,
  imageUrl: null,
  badgeLabel: 'From CareMate',
  advertiserName: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDeviceDefaults.mockResolvedValue({ countryCode: 'NG' });
  mockCountImpressionsToday.mockResolvedValue(0);
  mockGetCachedPremiumState.mockResolvedValue({ tier: 'free' });
  mockIsOnline.mockResolvedValue(true);
  mockIsAdsConsentReady.mockReturnValue(true);
  mockCanRequestAds.mockResolvedValue(true);
  mockGetAdMobBannerUnitId.mockReturnValue('ca-app-pub-test/unit');
});

describe('resolveAdForSlot', () => {
  it('returns null when ads are globally disabled', async () => {
    mockGetRemoteConfig.mockResolvedValue({ ...baseRemote, adsEnabled: false });

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
    expect(mockListEligibleForSlot).not.toHaveBeenCalled();
  });

  it('returns null when slot mode is off', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'off' },
    });

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns house catalog ad when eligible inventory exists', async () => {
    mockGetRemoteConfig.mockResolvedValue(baseRemote);
    mockListEligibleForSlot.mockResolvedValue([catalogItem]);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toMatchObject({
      kind: 'catalog',
      source: 'house',
      campaignId: 'camp-1',
      title: 'Title',
    });
    expect(mockListEligibleForSlot).toHaveBeenCalledWith(slotId, 'house', {
      countryCode: 'NG',
    });
  });

  it('returns null for house mode when no eligible inventory (no fallback)', async () => {
    mockGetRemoteConfig.mockResolvedValue(baseRemote);
    mockListEligibleForSlot.mockResolvedValue([]);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns sponsored catalog ad only in sponsored mode', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'sponsored' },
    });
    mockListEligibleForSlot.mockResolvedValue([
      { ...catalogItem, source: 'sponsored', advertiserName: 'Acme Hospital' },
    ]);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toMatchObject({
      kind: 'catalog',
      source: 'sponsored',
      advertiserName: 'Acme Hospital',
    });
    expect(mockListEligibleForSlot).toHaveBeenCalledWith(slotId, 'sponsored', expect.any(Object));
  });

  it('skips catalog items that hit frequency cap', async () => {
    mockGetRemoteConfig.mockResolvedValue(baseRemote);
    mockListEligibleForSlot.mockResolvedValue([
      catalogItem,
      { ...catalogItem, campaignId: 'camp-2', creativeId: 'creative-2' },
    ]);
    mockCountImpressionsToday.mockResolvedValueOnce(6).mockResolvedValueOnce(0);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toMatchObject({ campaignId: 'camp-2' });
    expect(mockCountImpressionsToday).toHaveBeenCalledWith('camp-1', slotId);
  });

  it('passes slot id when checking frequency cap', async () => {
    mockGetRemoteConfig.mockResolvedValue(baseRemote);
    mockListEligibleForSlot.mockResolvedValue([catalogItem]);

    await resolveAdForSlot({
      slotId: AD_SLOTS.LEARN_ARTICLE_HEADER,
      userId: 'user-1',
      isGuest: false,
    });

    expect(mockCountImpressionsToday).toHaveBeenCalledWith('camp-1', AD_SLOTS.LEARN_ARTICLE_HEADER);
  });

  it('returns AdMob banner for free signed-in users when mode is admob', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toMatchObject({
      kind: 'admob',
      source: 'admob',
      unitId: 'ca-app-pub-test/unit',
    });
    expect(mockListEligibleForSlot).not.toHaveBeenCalled();
  });

  it('returns AdMob for guests when mode is admob', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });

    const result = await resolveAdForSlot({
      slotId,
      userId: null,
      isGuest: true,
    });

    expect(result).toMatchObject({ kind: 'admob' });
    expect(mockGetCachedPremiumState).not.toHaveBeenCalled();
  });

  it('returns null for AdMob when user is Premium', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });
    mockGetCachedPremiumState.mockResolvedValue({ tier: 'premium' });

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for AdMob when offline', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });
    mockIsOnline.mockResolvedValue(false);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for AdMob when consent is not ready', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });
    mockIsAdsConsentReady.mockReturnValue(false);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for AdMob when unit id is missing', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'admob' },
    });
    mockGetAdMobBannerUnitId.mockReturnValue(null);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('does not fall back from house to admob when house is empty', async () => {
    mockGetRemoteConfig.mockResolvedValue({
      ...baseRemote,
      slotMode: { ...baseRemote.slotMode, 'home.feed': 'house' },
    });
    mockListEligibleForSlot.mockResolvedValue([]);

    const result = await resolveAdForSlot({
      slotId,
      userId: 'user-1',
      isGuest: false,
    });

    expect(result).toBeNull();
    expect(mockGetAdMobBannerUnitId).not.toHaveBeenCalled();
  });
});
