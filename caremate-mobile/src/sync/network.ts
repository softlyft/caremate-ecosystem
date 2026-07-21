import * as Network from 'expo-network';

let cachedOnline = true;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    cachedOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    return cachedOnline;
  } catch {
    return cachedOnline;
  }
}

export function getCachedOnlineStatus(): boolean {
  return cachedOnline;
}

export async function watchNetworkStatus(onChange: (online: boolean) => void): Promise<() => void> {
  const interval = setInterval(async () => {
    const online = await isOnline();
    onChange(online);
  }, 5000);

  return () => clearInterval(interval);
}
