import {
  buildSpouseInviteMessage,
  familyConnectionService,
} from '@/domains/family/connection-service';
import { FAMILY_GENDERS } from '@/domains/family/types';

const mockRpc = jest.fn();
const mockInvoke = jest.fn();
const mockSaveConnectionRequestLocal = jest.fn();
const mockPullFromRemote = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock('@/domains/family/repository', () => ({
  familyRepository: {
    saveConnectionRequestLocal: (...args: unknown[]) => mockSaveConnectionRequestLocal(...args),
    pullFromRemote: (...args: unknown[]) => mockPullFromRemote(...args),
  },
}));

jest.mock('@/utils/helpers', () => ({
  createId: jest.fn(async () => 'local-id'),
  nowIso: jest.fn(() => '2026-07-17T12:00:00.000Z'),
}));

describe('family types', () => {
  it('exposes gender options', () => {
    expect(FAMILY_GENDERS.map((item) => item.value)).toEqual([
      'male',
      'female',
      'other',
      'prefer_not_to_say',
    ]);
  });
});

describe('buildSpouseInviteMessage', () => {
  it('includes the sender name and store links', () => {
    const { message } = buildSpouseInviteMessage({ fromName: 'Ada' });
    expect(message).toContain('Ada');
    expect(message).toContain('iPhone');
    expect(message).toContain('Android');
  });
});

describe('familyConnectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks up users by email and phone', async () => {
    mockRpc.mockResolvedValue({
      data: {
        user_id: 'u2',
        full_name: 'Grace',
        email: 'g@example.com',
        phone: null,
        date_of_birth: null,
        country_code: 'NG',
        state: null,
        avatar_url: null,
      },
      error: null,
    });

    await expect(familyConnectionService.lookupUser('g@example.com')).resolves.toEqual(
      expect.objectContaining({ userId: 'u2', fullName: 'Grace', email: 'g@example.com' }),
    );

    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(familyConnectionService.lookupUser('+234 800')).resolves.toBeNull();
  });

  it('rejects blank lookup queries', async () => {
    await expect(familyConnectionService.lookupUser('   ')).rejects.toThrow(/email or phone/i);
  });

  it('falls back to a local pending request when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    mockSaveConnectionRequestLocal.mockResolvedValue(undefined);

    const result = await familyConnectionService.requestConnection({
      householdId: 'hh-1',
      fromUserId: 'u1',
      fromName: 'Ada',
      emailOrPhone: 'spouse@example.com',
      matchedUser: {
        userId: 'u2',
        fullName: 'Grace',
        email: 'spouse@example.com',
        phone: null,
        dateOfBirth: null,
        countryCode: null,
        state: null,
        avatarUrl: null,
      },
    });

    expect(result.request.id).toBe('local-id');
    expect(result.request.status).toBe('pending');
    expect(mockSaveConnectionRequestLocal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'local-id' }),
      { queue: true },
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('invokes notify-family-email after a successful remote create', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: 'req-cloud',
        household_id: 'hh-1',
        from_user_id: 'u1',
        to_user_id: 'u2',
        to_email: 'spouse@example.com',
        to_phone: null,
        status: 'pending',
        invite_token: null,
        created_at: '2026-07-17T12:00:00.000Z',
        updated_at: '2026-07-17T12:00:00.000Z',
      },
      error: null,
    });
    mockSaveConnectionRequestLocal.mockResolvedValue(undefined);
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await familyConnectionService.requestConnection({
      householdId: 'hh-1',
      fromUserId: 'u1',
      fromName: 'Ada',
      emailOrPhone: 'spouse@example.com',
      matchedUser: {
        userId: 'u2',
        fullName: 'Grace',
        email: 'spouse@example.com',
        phone: null,
        dateOfBirth: null,
        countryCode: null,
        state: null,
        avatarUrl: null,
      },
    });

    expect(mockInvoke).toHaveBeenCalledWith('notify-family-email', {
      body: { requestId: 'req-cloud' },
    });
  });

  it('responds to connection requests and refreshes family', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockPullFromRemote.mockResolvedValue(undefined);
    await familyConnectionService.respondToRequest({
      requestId: 'req-1',
      userId: 'u1',
      accept: true,
      selfFullName: 'Ada',
    });
    expect(mockPullFromRemote).toHaveBeenCalledWith('u1');
  });
});
