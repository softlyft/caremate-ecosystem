import {
  buildEmergencyShareUrl,
  isValidEmergencyShareToken,
  parseEmergencyShareToken,
} from '@/domains/emergency/share';

jest.mock('@/lib/app-links', () => {
  const actual = jest.requireActual<typeof import('@/lib/app-links')>('@/lib/app-links');
  return {
    ...actual,
    shouldPreferHttpsAppLinks: jest.fn(() => false),
    buildHttpsAppLink: jest.fn((path: string) => `https://getcaremate.com/${path}`),
  };
});

describe('emergency share token helpers', () => {
  it('validates 32-char hex tokens', () => {
    expect(isValidEmergencyShareToken('a'.repeat(32))).toBe(true);
    expect(isValidEmergencyShareToken('A'.repeat(32))).toBe(true);
    expect(isValidEmergencyShareToken('short')).toBe(false);
    expect(isValidEmergencyShareToken(null)).toBe(false);
  });

  it('builds opaque caremate deep links without PHI', () => {
    const token = '0123456789abcdef0123456789abcdef';
    expect(buildEmergencyShareUrl(token)).toBe(`caremate://emergency/share/${token}`);
  });

  it('appends a non-PHI version query when emergency profile changes', () => {
    const token = '0123456789abcdef0123456789abcdef';
    const version = '2026-08-26T12:00:00.000Z';
    expect(buildEmergencyShareUrl(token, { version })).toBe(
      `caremate://emergency/share/${token}?v=${encodeURIComponent(version)}`,
    );
  });

  it('builds https Universal Links when preferred', () => {
    const { shouldPreferHttpsAppLinks } = jest.requireMock('@/lib/app-links') as {
      shouldPreferHttpsAppLinks: jest.Mock;
    };
    shouldPreferHttpsAppLinks.mockReturnValueOnce(true);
    const token = '0123456789abcdef0123456789abcdef';
    expect(buildEmergencyShareUrl(token)).toBe(`https://getcaremate.com/emergency/share/${token}`);
  });

  it('parses tokens from deep links and raw hex', () => {
    const token = '0123456789abcdef0123456789abcdef';
    expect(parseEmergencyShareToken(token)).toBe(token);
    expect(parseEmergencyShareToken(`caremate://emergency/share/${token}`)).toBe(token);
    expect(parseEmergencyShareToken(`https://getcaremate.com/emergency/share/${token}`)).toBe(
      token,
    );
    expect(
      parseEmergencyShareToken(
        `caremate://emergency/share/${token}?v=${encodeURIComponent('2026-08-26T12:00:00.000Z')}`,
      ),
    ).toBe(token);
    expect(parseEmergencyShareToken(`exp://127.0.0.1:8081/--/emergency/share/${token}`)).toBe(
      token,
    );
    expect(parseEmergencyShareToken('not-a-token')).toBeNull();
  });
});
