import {
  formatPatientId,
  generatePatientIdDigits,
  isValidPatientId,
} from '@/domains/profile/patient-id';

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async () =>
    // 0–9 map cleanly; include one rejected byte (>249) to exercise skip path.
    Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 250, 12, 13, 14]),
  ),
}));

describe('patient id helpers', () => {
  it('formats and validates 12-digit ids', () => {
    expect(isValidPatientId('123456789012')).toBe(true);
    expect(isValidPatientId('123')).toBe(false);
    expect(isValidPatientId(null)).toBe(false);
    expect(formatPatientId('123456789012')).toBe('1234 5678 9012');
    expect(formatPatientId('bad')).toBe('');
    expect(formatPatientId(undefined)).toBe('');
  });

  it('generates a 12-digit id via rejection sampling', async () => {
    const id = await generatePatientIdDigits();
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^\d{12}$/);
  });
});
