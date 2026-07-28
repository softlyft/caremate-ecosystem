/** E.164 allows at most 15 digits (country code + subscriber number). */
export const MAX_PHONE_DIGITS = 15;

/** Minimum digits when a phone value is provided (optional field may be empty). */
export const MIN_PHONE_DIGITS = 7;

/**
 * Strip letters/symbols except an optional leading `+`, and cap digit length.
 * Used while typing so invalid characters never enter the field.
 */
export function sanitizePhoneInput(value: string): string {
  const trimmed = value.trimStart();
  const hasPlus = trimmed.startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
  if (!digits) {
    return hasPlus ? '+' : '';
  }
  return hasPlus ? `+${digits}` : digits;
}

/** Digits only (no leading +). */
export function phoneDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * Empty / whitespace is valid (phone is optional).
 * Non-empty values must be 7–15 digits (optional leading +).
 */
export function isValidPhone(value: string | null | undefined): boolean {
  if (value == null || !value.trim()) {
    return true;
  }
  const digits = phoneDigits(value);
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return false;
  }
  // After sanitize, only + and digits remain; reject anything else that slipped in.
  return /^\+?\d+$/.test(value.trim());
}
