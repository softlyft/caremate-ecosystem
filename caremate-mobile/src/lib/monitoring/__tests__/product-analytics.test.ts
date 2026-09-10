import {
  ProductEvents,
  nearbyEntityTypeForProvider,
  resetProductAnalyticsForTests,
  setProductAnalyticsContext,
  trackAppOpened,
  trackMiniAppUsed,
  trackNearbySearch,
  trackPayerConnectionStarted,
  trackProviderConnectionCompleted,
  trackProviderSearched,
  vitalActionForType,
} from '@/lib/monitoring/product-analytics';

const mockTrackEvent = jest.fn();

jest.mock('@/lib/monitoring/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

jest.mock('@/constants/env', () => ({
  config: { appVersion: '1.2.3' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('product analytics', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    resetProductAnalyticsForTests();
    setProductAnalyticsContext({ country: 'NG', language: 'en' });
  });

  it('attaches standard properties and never includes a search query', () => {
    trackNearbySearch();
    trackProviderSearched();

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, ProductEvents.nearbySearch, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, ProductEvents.providerSearched, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
    });
    expect(JSON.stringify(mockTrackEvent.mock.calls)).not.toMatch(/query|email|phone/i);
  });

  it('treats mini-app use as the qualifying caremate_active event', () => {
    trackMiniAppUsed('vitals-tracker', 'blood_pressure_recorded');

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, ProductEvents.miniAppUsed, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
      mini_app: 'vitals-tracker',
      action: 'blood_pressure_recorded',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, ProductEvents.caremateActive, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
      activity_type: 'feature_used',
      feature: 'vitals-tracker',
      surface: 'mini_app',
    });
  });

  it('does not count app_opened as caremate_active and emits it once per session', () => {
    trackAppOpened();
    trackAppOpened();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProductEvents.appOpened,
      expect.objectContaining({
        session_id: expect.any(String),
      }),
    );
    expect(mockTrackEvent.mock.calls.some((call) => call[0] === ProductEvents.caremateActive)).toBe(
      false,
    );
  });

  it('maps nearby entity types without a second vocabulary', () => {
    expect(nearbyEntityTypeForProvider('pharmacy')).toBe('pharmacy');
    expect(nearbyEntityTypeForProvider('laboratory')).toBe('laboratory');
    expect(nearbyEntityTypeForProvider('hospital')).toBe('hospital');
    expect(nearbyEntityTypeForProvider('insurance')).toBe('payer');
    expect(nearbyEntityTypeForProvider('clinic')).toBe('provider');
    expect(vitalActionForType('blood_pressure')).toBe('blood_pressure_recorded');
  });

  it('identifies connections with organization ids only', () => {
    trackProviderConnectionCompleted('org-1');
    trackPayerConnectionStarted('payer-1');

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, ProductEvents.providerConnectionCompleted, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
      provider_id: 'org-1',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, ProductEvents.caremateActive, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
      activity_type: 'connection_completed',
      feature: 'provider',
      surface: 'provider',
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(3, ProductEvents.payerConnectionStarted, {
      country: 'NG',
      language: 'en',
      app_version: '1.2.3',
      platform: 'ios',
      payer_id: 'payer-1',
    });
  });
});
