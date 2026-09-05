import {
  CANNOT_INVITE_SELF_MESSAGE,
  assertNotFamilySelfInvite,
  familyConnectionErrorKey,
  isFamilySelfInvite,
} from '@/domains/family/invite-guards';

describe('family invite self-guards', () => {
  it('blocks when matched user id equals the sender', () => {
    expect(
      isFamilySelfInvite({
        fromUserId: 'u1',
        matchedUser: { userId: 'u1' },
      }),
    ).toBe(true);
  });

  it('allows inviting a different matched user', () => {
    expect(
      isFamilySelfInvite({
        fromUserId: 'u1',
        matchedUser: { userId: 'u2' },
      }),
    ).toBe(false);
  });

  it('blocks when lookup email matches own email (case-insensitive)', () => {
    expect(
      isFamilySelfInvite({
        fromUserId: 'u1',
        lookupQuery: 'Me@Example.com',
        ownEmail: 'me@example.com',
      }),
    ).toBe(true);
  });

  it('blocks when lookup phone matches own phone ignoring formatting', () => {
    expect(
      isFamilySelfInvite({
        fromUserId: 'u1',
        lookupQuery: '+234 801 234 5678',
        ownPhone: '2348012345678',
      }),
    ).toBe(true);
  });

  it('does not treat short or empty lookups as self', () => {
    expect(
      isFamilySelfInvite({
        fromUserId: 'u1',
        lookupQuery: 'ab',
        ownEmail: 'me@example.com',
      }),
    ).toBe(false);
  });

  it('throws a clear error from assertNotFamilySelfInvite', () => {
    expect(() =>
      assertNotFamilySelfInvite({
        fromUserId: 'u1',
        matchedUser: { userId: 'u1' },
      }),
    ).toThrow(CANNOT_INVITE_SELF_MESSAGE);
  });

  it('maps server and client self-invite errors to i18n keys', () => {
    expect(familyConnectionErrorKey(new Error(CANNOT_INVITE_SELF_MESSAGE))).toBe(
      'family.cannotInviteSelf',
    );
    expect(familyConnectionErrorKey(new Error('That person is already in this household'))).toBe(
      'family.alreadyInHousehold',
    );
    expect(
      familyConnectionErrorKey(new Error('A pending invite already exists for that person')),
    ).toBe('family.pendingInviteExists');
    expect(
      familyConnectionErrorKey(new Error('Family Premium allows up to 3 invited members')),
    ).toBe('family.inviteSeatsFull');
    expect(familyConnectionErrorKey(new Error('boom'))).toBe('family.connectionFailedMessage');
  });
});
