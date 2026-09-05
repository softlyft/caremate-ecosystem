import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/config';
import { getRememberedLoginEmail, setRememberedLoginEmail } from '@/domains/auth/remember-login';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('remember-login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized remembered email', async () => {
    storage.getItem.mockResolvedValueOnce('  User@Example.COM ');
    await expect(getRememberedLoginEmail()).resolves.toBe('user@example.com');
    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.rememberedLoginEmail);
  });

  it('saves email when remember is true', async () => {
    await setRememberedLoginEmail('User@Example.COM', true);
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.rememberedLoginEmail,
      'user@example.com',
    );
  });

  it('clears email when remember is false', async () => {
    await setRememberedLoginEmail('user@example.com', false);
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.rememberedLoginEmail);
  });
});
