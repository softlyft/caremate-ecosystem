import {
  buildEmergencyShareUrl,
  isValidEmergencyShareToken,
  parseEmergencyShareToken,
} from '@/domains/emergency/share';

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

  it('parses tokens from deep links and raw hex', () => {
    const token = '0123456789abcdef0123456789abcdef';
    expect(parseEmergencyShareToken(token)).toBe(token);
    expect(parseEmergencyShareToken(`caremate://emergency/share/${token}`)).toBe(token);
    expect(parseEmergencyShareToken(`exp://127.0.0.1:8081/--/emergency/share/${token}`)).toBe(
      token,
    );
    expect(parseEmergencyShareToken('not-a-token')).toBeNull();
  });
});
