import {
  ADMIN_ONLY_MOBILE_MESSAGE,
  CARE_PORTAL_ONLY_MOBILE_MESSAGE,
  ConsumerMobileAccountError,
  assertConsumerMobileAccount,
  isSoftLyftStaffRole,
  type ConsumerMobileAccountChecks,
} from '@/domains/auth/assert-consumer-mobile-account';

function checks(overrides: Partial<ConsumerMobileAccountChecks> = {}): ConsumerMobileAccountChecks {
  return {
    hasActiveCarePortalMembership: jest.fn(async () => false),
    hasApprovedPatientOrgConnection: jest.fn(async () => false),
    signOutLocal: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('isSoftLyftStaffRole', () => {
  it('recognizes admin, editor, and support', () => {
    expect(isSoftLyftStaffRole('admin')).toBe(true);
    expect(isSoftLyftStaffRole('editor')).toBe(true);
    expect(isSoftLyftStaffRole('support')).toBe(true);
    expect(isSoftLyftStaffRole('patient')).toBe(false);
    expect(isSoftLyftStaffRole(null)).toBe(false);
  });
});

describe('assertConsumerMobileAccount', () => {
  it('allows ordinary patient accounts with no org membership', async () => {
    const deps = checks();
    await expect(
      assertConsumerMobileAccount({ id: 'user-1', app_metadata: {} }, deps),
    ).resolves.toBeUndefined();
    expect(deps.signOutLocal).not.toHaveBeenCalled();
  });

  it('rejects SoftLyft staff and signs out locally', async () => {
    const deps = checks();
    await expect(
      assertConsumerMobileAccount({ id: 'staff-1', app_metadata: { role: 'admin' } }, deps),
    ).rejects.toMatchObject({
      name: 'ConsumerMobileAccountError',
      reason: 'admin_only',
      message: ADMIN_ONLY_MOBILE_MESSAGE,
    });
    expect(deps.signOutLocal).toHaveBeenCalledTimes(1);
    expect(deps.hasActiveCarePortalMembership).not.toHaveBeenCalled();
  });

  it('rejects Care Portal–only membership without a patient connection', async () => {
    const deps = checks({
      hasActiveCarePortalMembership: jest.fn(async () => true),
      hasApprovedPatientOrgConnection: jest.fn(async () => false),
    });
    await expect(assertConsumerMobileAccount({ id: 'claim-1' }, deps)).rejects.toBeInstanceOf(
      ConsumerMobileAccountError,
    );
    await expect(assertConsumerMobileAccount({ id: 'claim-1' }, deps)).rejects.toMatchObject({
      reason: 'care_portal_only',
      message: CARE_PORTAL_ONLY_MOBILE_MESSAGE,
    });
    expect(deps.signOutLocal).toHaveBeenCalled();
  });

  it('allows mark-as-staff dual-role (membership + approved patient connection)', async () => {
    const deps = checks({
      hasActiveCarePortalMembership: jest.fn(async () => true),
      hasApprovedPatientOrgConnection: jest.fn(async () => true),
    });
    await expect(assertConsumerMobileAccount({ id: 'dual-1' }, deps)).resolves.toBeUndefined();
    expect(deps.signOutLocal).not.toHaveBeenCalled();
  });
});
