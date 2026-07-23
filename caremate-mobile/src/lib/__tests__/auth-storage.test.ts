import { Platform } from 'react-native';

import {
  handleAuthCallbackUrl,
  getPasswordResetRedirectUri,
  PASSWORD_RESET_PATH,
} from '@/lib/auth-deep-link';
import { authStorage } from '@/lib/storage';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `caremate://${path}`),
  parse: jest.fn((url: string) => {
    const hashIndex = url.indexOf('#');
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const queryIndex = withoutHash.indexOf('?');
    const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
    const params = Object.fromEntries(new URLSearchParams(query).entries());
    let scheme = '';
    let hostname = '';
    try {
      const parsed = new URL(withoutHash);
      scheme = parsed.protocol.replace(':', '');
      hostname = parsed.hostname;
    } catch {
      scheme = withoutHash.includes('://') ? withoutHash.split('://')[0] : '';
    }
    return { scheme, hostname, queryParams: params };
  }),
}));

jest.mock('@/constants/env', () => ({
  config: {
    isSupabaseConfigured: true,
    websiteUrl: 'https://getcaremate.com',
  },
}));

jest.mock('@/lib/app-links', () => {
  const actual = jest.requireActual<typeof import('@/lib/app-links')>('@/lib/app-links');
  return {
    ...actual,
    shouldPreferHttpsAppLinks: jest.fn(() => false),
  };
});

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockSecureGet = jest.fn();
const mockSecureSet = jest.fn();
const mockSecureDelete = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockSecureGet(...args),
  setItemAsync: (...args: unknown[]) => mockSecureSet(...args),
  deleteItemAsync: (...args: unknown[]) => mockSecureDelete(...args),
}));

describe('auth deep link', () => {
  it('builds the password-reset redirect URI', () => {
    expect(getPasswordResetRedirectUri()).toBe(`caremate://${PASSWORD_RESET_PATH}`);
  });

  it('exchanges auth code for a recovery session', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue(undefined);
    const setSession = jest.fn();
    await expect(
      handleAuthCallbackUrl(`caremate://${PASSWORD_RESET_PATH}?code=abc`, {
        exchangeCodeForSession,
        setSession,
      }),
    ).resolves.toBe('recovery');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('sets session from hash tokens', async () => {
    const exchangeCodeForSession = jest.fn();
    const setSession = jest.fn().mockResolvedValue(undefined);
    await expect(
      handleAuthCallbackUrl(
        `caremate://auth/callback#access_token=at&refresh_token=rt&type=recovery`,
        { exchangeCodeForSession, setSession },
      ),
    ).resolves.toBe('recovery');
    expect(setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
  });

  it('sets session from query tokens', async () => {
    const exchangeCodeForSession = jest.fn();
    const setSession = jest.fn().mockResolvedValue(undefined);
    await expect(
      handleAuthCallbackUrl(
        'caremate://auth/callback?access_token=at&refresh_token=rt&type=session',
        { exchangeCodeForSession, setSession },
      ),
    ).resolves.toBe('session');
  });

  it('returns null when no usable tokens are present', async () => {
    await expect(
      handleAuthCallbackUrl('caremate://home', {
        exchangeCodeForSession: jest.fn(),
        setSession: jest.fn(),
      }),
    ).resolves.toBeNull();
  });

  it('rejects credential URLs on non-allowlisted paths', async () => {
    const setSession = jest.fn();
    await expect(
      handleAuthCallbackUrl('caremate://evil#access_token=at&refresh_token=rt', {
        exchangeCodeForSession: jest.fn(),
        setSession,
      }),
    ).resolves.toBeNull();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('accepts https Universal Link auth callbacks on getcaremate.com', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue(undefined);
    await expect(
      handleAuthCallbackUrl(`https://getcaremate.com/${PASSWORD_RESET_PATH}?code=abc`, {
        exchangeCodeForSession,
        setSession: jest.fn(),
      }),
    ).resolves.toBe('recovery');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('rejects https auth callbacks on unknown hosts', async () => {
    await expect(
      handleAuthCallbackUrl(`https://evil.example/${PASSWORD_RESET_PATH}?code=abc`, {
        exchangeCodeForSession: jest.fn(),
        setSession: jest.fn(),
      }),
    ).resolves.toBeNull();
  });
});

describe('auth storage', () => {
  const platform = Platform as { OS: string };

  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockSecureGet.mockReset();
    mockSecureSet.mockReset();
    mockSecureDelete.mockReset();
    platform.OS = 'ios';
  });

  it('uses SecureStore on native', async () => {
    mockSecureGet.mockResolvedValue('secret');
    await expect(authStorage.getItem('k')).resolves.toBe('secret');
    await authStorage.setItem('k', 'v');
    await authStorage.removeItem('k');
    expect(mockSecureSet).toHaveBeenCalledWith('k', 'v');
    expect(mockSecureDelete).toHaveBeenCalledWith('k');
  });

  it('uses AsyncStorage in web browsers', async () => {
    platform.OS = 'web';
    (globalThis as { window?: unknown }).window = {};
    mockGetItem.mockResolvedValue('browser');
    await expect(authStorage.getItem('k')).resolves.toBe('browser');
    await authStorage.setItem('k', 'v');
    await authStorage.removeItem('k');
    expect(mockSetItem).toHaveBeenCalledWith('k', 'v');
    expect(mockRemoveItem).toHaveBeenCalledWith('k');
    delete (globalThis as { window?: unknown }).window;
  });

  it('no-ops during web SSR without window', async () => {
    platform.OS = 'web';
    delete (globalThis as { window?: unknown }).window;
    await expect(authStorage.getItem('k')).resolves.toBeNull();
    await authStorage.setItem('k', 'v');
    await authStorage.removeItem('k');
    expect(mockSecureSet).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
