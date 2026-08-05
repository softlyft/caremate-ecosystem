import { STORAGE_KEYS } from '@/constants/config';
import {
  bindDeviceAccount,
  clearDeviceAccountBinding,
  getDeviceAccountBinding,
  getDeviceAccountConflict,
  maskAccountEmail,
  normalizeAccountEmail,
  resetDeviceForNewAccount,
} from '@/domains/auth/device-account-binding';
import { authStorage } from '@/lib/storage';

jest.mock('@/lib/storage', () => ({
  authStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/domains/auth/wipe-local-account', () => ({
  wipeLocalAccountData: jest.fn(async () => undefined),
}));

const { wipeLocalAccountData } = jest.requireMock('@/domains/auth/wipe-local-account') as {
  wipeLocalAccountData: jest.Mock;
};

const storage = authStorage as jest.Mocked<typeof authStorage>;

describe('device-account-binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
    storage.removeItem.mockResolvedValue(undefined);
  });

  it('normalizes and masks emails', () => {
    expect(normalizeAccountEmail('  Jo.Doe@Example.COM ')).toBe('jo.doe@example.com');
    expect(maskAccountEmail('jordan@gmail.com')).toBe('jo***@g***.com');
    expect(maskAccountEmail('ab@x.co')).toBe('a***@x***.co');
  });

  it('reports no conflict when unbound or same email', async () => {
    await expect(getDeviceAccountConflict('a@b.com')).resolves.toBeNull();

    storage.getItem.mockResolvedValue(JSON.stringify({ email: 'same@caremate.com', userId: 'u1' }));
    await expect(getDeviceAccountConflict('Same@Caremate.com')).resolves.toBeNull();
  });

  it('reports conflict with masked email for a different account', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ email: 'owner@caremate.com', userId: 'u1' }),
    );
    await expect(getDeviceAccountConflict('other@caremate.com')).resolves.toEqual({
      maskedEmail: 'ow***@c***.com',
      boundEmail: 'owner@caremate.com',
      boundUserId: 'u1',
    });
  });

  it('binds and clears via SecureStore key', async () => {
    await bindDeviceAccount('user-1', 'Person@Example.com');
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.deviceAccountBinding,
      JSON.stringify({ email: 'person@example.com', userId: 'user-1' }),
    );

    await clearDeviceAccountBinding();
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.deviceAccountBinding);
  });

  it('wipes previous userId when same email rebinds under a new id', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ email: 'same@caremate.com', userId: 'old-id' }),
    );
    await bindDeviceAccount('new-id', 'same@caremate.com');
    expect(wipeLocalAccountData).toHaveBeenCalledWith('old-id');
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.deviceAccountBinding,
      JSON.stringify({ email: 'same@caremate.com', userId: 'new-id' }),
    );
  });

  it('resetDeviceForNewAccount wipes bound user then clears binding', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ email: 'owner@caremate.com', userId: 'u-wipe' }),
    );
    await resetDeviceForNewAccount();
    expect(wipeLocalAccountData).toHaveBeenCalledWith('u-wipe');
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.deviceAccountBinding);
  });

  it('getDeviceAccountBinding ignores corrupt payloads', async () => {
    storage.getItem.mockResolvedValue('{not-json');
    await expect(getDeviceAccountBinding()).resolves.toBeNull();
  });
});
