import {
  AnalyticsEvents,
  bindPostHogClient,
  identifyAnalyticsUser,
  isAnalyticsEnabled,
  resetAnalytics,
  trackEvent,
  trackScreen,
} from '@/lib/monitoring/analytics';

jest.mock('@/constants/env', () => ({
  config: {
    isPostHogConfigured: true,
    posthogEnableInDev: true,
    posthogApiKey: 'phc_test',
    posthogHost: 'https://us.i.posthog.com',
  },
}));

const mockEnqueue = jest.fn(async (_params?: unknown) => undefined);
const mockFlush = jest.fn(async () => undefined);
const mockBindSender = jest.fn((_instance?: unknown) => undefined);

jest.mock('@/lib/monitoring/analytics-queue', () => ({
  bindAnalyticsSender: (instance: unknown) => mockBindSender(instance),
  enqueueAnalyticsEvent: (params: unknown) => mockEnqueue(params),
  flushAnalyticsQueue: () => mockFlush(),
  requestAnalyticsFlush: jest.fn(),
}));

describe('analytics', () => {
  const capture = jest.fn();
  const screen = jest.fn();
  const identify = jest.fn();
  const reset = jest.fn();

  beforeEach(() => {
    capture.mockClear();
    screen.mockClear();
    identify.mockClear();
    reset.mockClear();
    mockEnqueue.mockClear();
    mockFlush.mockClear();
    mockBindSender.mockClear();
    bindPostHogClient({
      capture,
      screen,
      identify,
      reset,
    } as never);
  });

  afterEach(() => {
    bindPostHogClient(null);
  });

  it('reports analytics enabled when configured', () => {
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('queues named product events instead of capturing immediately', async () => {
    trackEvent(AnalyticsEvents.signIn, { method: 'email' });
    await Promise.resolve();
    expect(mockEnqueue).toHaveBeenCalledWith({
      kind: 'event',
      name: AnalyticsEvents.signIn,
      properties: { method: 'email' },
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('queues screens', async () => {
    trackScreen('/(app)/(tabs)', { segments: '(app)/(tabs)' });
    await Promise.resolve();
    expect(mockEnqueue).toHaveBeenCalledWith({
      kind: 'screen',
      name: '/(app)/(tabs)',
      properties: { segments: '(app)/(tabs)' },
    });
  });

  it('identifies signed-in users and resets guests', () => {
    identifyAnalyticsUser({ id: 'u1', email: 'a@b.co', isGuest: false });
    expect(identify).toHaveBeenCalledWith('u1', { email: 'a@b.co' });

    identifyAnalyticsUser({ id: 'guest', isGuest: true });
    expect(reset).toHaveBeenCalled();
  });

  it('resetAnalytics calls client.reset', () => {
    resetAnalytics();
    expect(reset).toHaveBeenCalled();
  });

  it('binds a sender and flushes when the PostHog client is ready', () => {
    expect(mockBindSender).toHaveBeenCalled();
    expect(mockFlush).toHaveBeenCalled();
  });
});
