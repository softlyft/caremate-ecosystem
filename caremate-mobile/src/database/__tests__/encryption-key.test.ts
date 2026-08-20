import {
  buildSqlCipherKeyPragma,
  getOrCreateSqliteEncryptionKey,
  shouldEncryptSqlite,
  SQLITE_ENCRYPTION_KEY_STORAGE,
} from '@/database/encryption-key';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockSecureGet = jest.fn();
const mockSecureSet = jest.fn();
const mockGetRandomBytesAsync = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockSecureGet(...args),
  setItemAsync: (...args: unknown[]) => mockSecureSet(...args),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 2,
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: (...args: unknown[]) => mockGetRandomBytesAsync(...args),
}));

jest.mock('@/lib/storage', () => ({
  authStorage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

describe('sqlite encryption key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureGet.mockResolvedValue(null);
    mockSecureSet.mockResolvedValue(undefined);
    mockGetRandomBytesAsync.mockResolvedValue(Uint8Array.from({ length: 32 }, (_, i) => i));
  });

  it('builds a raw-key PRAGMA', () => {
    const hex = 'a'.repeat(64);
    expect(buildSqlCipherKeyPragma(hex)).toBe(`PRAGMA key = "x'${hex}'";`);
  });

  it('rejects invalid keys in the PRAGMA builder', () => {
    expect(() => buildSqlCipherKeyPragma('short')).toThrow(/32-byte hex/i);
  });

  it('reuses an existing stored key', async () => {
    const hex = 'ab'.repeat(32);
    mockGetItem.mockResolvedValue(hex);
    await expect(getOrCreateSqliteEncryptionKey()).resolves.toBe(hex);
    expect(mockGetRandomBytesAsync).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('creates and stores a new key when missing', async () => {
    const key = await getOrCreateSqliteEncryptionKey();
    expect(key).toHaveLength(64);
    expect(mockSetItem).toHaveBeenCalledWith(SQLITE_ENCRYPTION_KEY_STORAGE, key);
  });

  it('encrypts on native platforms', () => {
    expect(shouldEncryptSqlite()).toBe(true);
  });
});
