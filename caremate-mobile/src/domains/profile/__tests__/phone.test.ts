import {
  isValidPhone,
  MAX_PHONE_DIGITS,
  MIN_PHONE_DIGITS,
  phoneDigits,
  sanitizePhoneInput,
} from '@/domains/profile/phone';

describe('phone helpers', () => {
  it('sanitizes to digits with optional leading plus and length cap', () => {
    expect(sanitizePhoneInput('abc')).toBe('');
    expect(sanitizePhoneInput('+234 801 234 5678')).toBe('+2348012345678');
    expect(sanitizePhoneInput('0801-234-5678')).toBe('08012345678');
    expect(sanitizePhoneInput('+1 (555) 123-4567 ext 99')).toBe('+1555123456799');
    expect(sanitizePhoneInput(`+${'1'.repeat(20)}`)).toBe(`+${'1'.repeat(MAX_PHONE_DIGITS)}`);
  });

  it('treats empty as valid and enforces digit bounds when present', () => {
    expect(isValidPhone(null)).toBe(true);
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('   ')).toBe(true);
    expect(isValidPhone('a')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('1'.repeat(MIN_PHONE_DIGITS))).toBe(true);
    expect(isValidPhone(`+${'2'.repeat(MIN_PHONE_DIGITS)}`)).toBe(true);
    expect(isValidPhone('1'.repeat(MAX_PHONE_DIGITS))).toBe(true);
    expect(isValidPhone('1'.repeat(MAX_PHONE_DIGITS + 1))).toBe(false);
  });

  it('extracts digits only', () => {
    expect(phoneDigits('+234-801')).toBe('234801');
  });
});
