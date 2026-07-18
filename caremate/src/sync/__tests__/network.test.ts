import { getCachedOnlineStatus, isOnline, watchNetworkStatus } from '@/sync/network';

const mockGetNetworkStateAsync = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: (...args: unknown[]) => mockGetNetworkStateAsync(...args),
}));

describe('sync network helpers', () => {
  beforeEach(() => {
    mockGetNetworkStateAsync.mockReset();
  });

  it('caches online status from network state', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    await expect(isOnline()).resolves.toBe(true);
    expect(getCachedOnlineStatus()).toBe(true);

    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    await expect(isOnline()).resolves.toBe(false);
    expect(getCachedOnlineStatus()).toBe(false);
  });

  it('falls back to cached value when network lookup fails', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    await isOnline();
    mockGetNetworkStateAsync.mockRejectedValue(new Error('offline probe failed'));
    await expect(isOnline()).resolves.toBe(true);
  });

  it('watches network status on an interval', async () => {
    jest.useFakeTimers();
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    const onChange = jest.fn();
    const stop = await watchNetworkStatus(onChange);
    await jest.advanceTimersByTimeAsync(5000);
    expect(onChange).toHaveBeenCalledWith(true);
    stop();
    jest.useRealTimers();
  });
});
