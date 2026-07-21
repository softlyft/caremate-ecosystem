import { hydrateAccountEntitlements } from '@/domains/billing/hydrate-entitlements';

const mockIsOnline = jest.fn();
const mockFamilyPull = jest.fn();
const mockBillingPull = jest.fn();

jest.mock('@/sync/network', () => ({
  isOnline: (...args: unknown[]) => mockIsOnline(...args),
}));

jest.mock('@/domains/family/repository', () => ({
  familyRepository: {
    pullFromRemote: (...args: unknown[]) => mockFamilyPull(...args),
  },
}));

jest.mock('@/domains/billing/repository', () => ({
  billingRepository: {
    pullFromRemote: (...args: unknown[]) => mockBillingPull(...args),
  },
}));

describe('hydrateAccountEntitlements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops without a user id or when offline', async () => {
    await hydrateAccountEntitlements('');
    mockIsOnline.mockResolvedValue(false);
    await hydrateAccountEntitlements('user-1');
    expect(mockFamilyPull).not.toHaveBeenCalled();
  });

  it('pulls family then billing while online', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockFamilyPull.mockResolvedValue(undefined);
    mockBillingPull.mockResolvedValue(undefined);
    await hydrateAccountEntitlements('user-1');
    expect(mockFamilyPull).toHaveBeenCalledWith('user-1');
    expect(mockBillingPull).toHaveBeenCalled();
  });

  it('swallows pull failures', async () => {
    mockIsOnline.mockResolvedValue(true);
    mockFamilyPull.mockRejectedValue(new Error('family'));
    mockBillingPull.mockRejectedValue(new Error('billing'));
    await expect(hydrateAccountEntitlements('user-1')).resolves.toBeUndefined();
  });
});
