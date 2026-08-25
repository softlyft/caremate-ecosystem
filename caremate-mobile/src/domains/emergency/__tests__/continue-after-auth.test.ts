import { continueAfterAuth } from '@/domains/emergency/continue-after-auth';

const mockReplace = jest.fn();
const mockTakePendingEmergencyShareToken = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('@/domains/emergency/share', () => ({
  takePendingEmergencyShareToken: (...args: unknown[]) =>
    mockTakePendingEmergencyShareToken(...args),
}));

describe('continueAfterAuth', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockTakePendingEmergencyShareToken.mockReset();
  });

  it('resumes a pending emergency share scan', async () => {
    mockTakePendingEmergencyShareToken.mockResolvedValue('0123456789abcdef0123456789abcdef');
    await continueAfterAuth();
    expect(mockReplace).toHaveBeenCalledWith('/emergency/share/0123456789abcdef0123456789abcdef');
  });

  it('falls back to the default app route when no token is pending', async () => {
    mockTakePendingEmergencyShareToken.mockResolvedValue(null);
    await continueAfterAuth();
    expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)');
  });

  it('uses a custom fallback route', async () => {
    mockTakePendingEmergencyShareToken.mockResolvedValue(null);
    await continueAfterAuth('/(app)/setup/done');
    expect(mockReplace).toHaveBeenCalledWith('/(app)/setup/done');
  });
});
