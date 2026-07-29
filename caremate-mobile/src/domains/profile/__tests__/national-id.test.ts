import {
  NATIONAL_ID_MAX_LENGTH,
  NATIONAL_ID_MIN_LENGTH,
  NIGERIAN_NIN_LENGTH,
  createNationalIdSchema,
  isValidGeneralNationalId,
  isValidNigerianNin,
  parseNationalId,
  sanitizeNationalIdInput,
} from '@/domains/profile/national-id';

const messages = {
  ninInvalid: 'Nigerian NIN must be 11 digits.',
  nationalIdInvalid: 'Enter 5–32 letters or numbers (no spaces).',
};

describe('national-id', () => {
  it('accepts empty values', () => {
    expect(isValidNigerianNin('')).toBe(true);
    expect(isValidNigerianNin(null)).toBe(true);
    expect(isValidGeneralNationalId('')).toBe(true);
    expect(parseNationalId('', 'NG', messages)).toEqual({ ok: true, value: null });
    expect(parseNationalId('   ', 'GH', messages)).toEqual({ ok: true, value: null });
  });

  it('validates Nigerian NIN as exactly 11 digits', () => {
    expect(isValidNigerianNin('12345678901')).toBe(true);
    expect(isValidNigerianNin('123')).toBe(false);
    expect(isValidNigerianNin('test')).toBe(false);
    expect(isValidNigerianNin('123456789012')).toBe(false);

    expect(parseNationalId('12345678901', 'NG', messages)).toEqual({
      ok: true,
      value: '12345678901',
    });
    expect(parseNationalId('a', 'NG', messages).ok).toBe(false);
    expect(parseNationalId('1234567890', 'ng', messages).ok).toBe(false);
  });

  it('validates other countries as alphanumeric 5–32', () => {
    expect(isValidGeneralNationalId('AB123')).toBe(true);
    expect(isValidGeneralNationalId('a'.repeat(NATIONAL_ID_MIN_LENGTH))).toBe(true);
    expect(isValidGeneralNationalId('a'.repeat(NATIONAL_ID_MAX_LENGTH))).toBe(true);
    expect(isValidGeneralNationalId('test')).toBe(false);
    expect(isValidGeneralNationalId('ab 12')).toBe(false);
    expect(isValidGeneralNationalId('a')).toBe(false);

    const schema = createNationalIdSchema('GH', messages);
    expect(schema.safeParse('GHA12345').success).toBe(true);
    expect(schema.safeParse('xyz').success).toBe(false);
    expect(schema.safeParse('id with spaces').success).toBe(false);
  });

  it('sanitizes input by country', () => {
    expect(sanitizeNationalIdInput('12a34b5678901extra', 'NG')).toBe('12345678901');
    expect(sanitizeNationalIdInput('12a34b5678901', 'NG').length).toBe(NIGERIAN_NIN_LENGTH);
    expect(sanitizeNationalIdInput('AB-12 34!', 'GH')).toBe('AB1234');
    expect(sanitizeNationalIdInput('x'.repeat(40), 'US').length).toBe(NATIONAL_ID_MAX_LENGTH);
  });
});
