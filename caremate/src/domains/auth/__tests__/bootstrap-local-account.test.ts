import { identityFromAuthUser } from '@/domains/auth/auth-identity';

describe('identityFromAuthUser', () => {
  it('reads email, metadata name, and phone', () => {
    expect(
      identityFromAuthUser({
        id: 'user-1',
        email: 'a@example.com',
        phone: '+234800',
        user_metadata: { full_name: 'Ada Lovelace', phone: '+234111' },
      }),
    ).toEqual({
      userId: 'user-1',
      email: 'a@example.com',
      fullName: 'Ada Lovelace',
      phone: '+234111',
    });
  });

  it('falls back to auth phone when metadata phone is missing', () => {
    expect(
      identityFromAuthUser({
        id: 'user-2',
        email: 'b@example.com',
        phone: '+234800',
        user_metadata: { full_name: 'Grace Hopper' },
      }).phone,
    ).toBe('+234800');
  });
});
