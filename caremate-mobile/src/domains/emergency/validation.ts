import type { EmergencyContact } from '@/types';

/** E.164 digit bounds (optional leading + is formatting, not a digit). */
export const ICE_PHONE_MIN_DIGITS = 7;
export const ICE_PHONE_MAX_DIGITS = 15;
/**
 * Character cap for the controlled input (+ and up to 15 digits).
 * Kept tight so native paste cannot exceed the field even before JS sanitizes.
 */
export const ICE_PHONE_MAX_CHARS = ICE_PHONE_MAX_DIGITS + 1;

/** Soft cap for first/last name fields (letters + limited punctuation). */
export const PERSON_NAME_MAX_CHARS = 40;
/**
 * Full-name fields (edit profile) allow first + space + last at the per-part cap.
 * Also blocks paste of chat logs / URLs from exploding the Me header layout.
 */
export const FULL_NAME_MAX_CHARS = PERSON_NAME_MAX_CHARS * 2 + 1;
/** At least one letter after trim. */
export const PERSON_NAME_MIN_CHARS = 1;

/**
 * Strip everything except an optional leading + and digits.
 * Caps to E.164 max digits so paste cannot dump letters or overlong numbers.
 */
export function sanitizePhoneInput(value: string): string {
  const trimmedStart = value.replace(/^\s+/, '');
  const wantsPlus = trimmedStart.startsWith('+') || trimmedStart.includes('+');
  const digits = value.replace(/\D/g, '').slice(0, ICE_PHONE_MAX_DIGITS);
  if (!digits) {
    return wantsPlus && trimmedStart.includes('+') ? '+' : '';
  }
  return wantsPlus ? `+${digits}` : digits;
}

export function countPhoneDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

/** True when the value is phone-shaped and within E.164 digit length bounds. */
export function isValidIcePhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !/^\+?\d+$/.test(trimmed)) {
    return false;
  }
  const digits = countPhoneDigits(trimmed);
  return digits >= ICE_PHONE_MIN_DIGITS && digits <= ICE_PHONE_MAX_DIGITS;
}

/**
 * Allow letters (any script), combining marks, spaces, hyphen, apostrophe, and period.
 * Collapses whitespace (including line breaks) and strips digits, emoji, URLs, and symbols.
 */
export function sanitizePersonNameInput(
  value: string,
  maxChars: number = PERSON_NAME_MAX_CHARS,
): string {
  return value
    .replace(/[^\p{L}\p{M}\s'.-]/gu, '')
    .replace(/[.]{2,}/g, '.')
    .replace(/[-']{2,}/g, (match) => match[0] ?? '')
    .replace(/\s+/g, ' ')
    .slice(0, maxChars);
}

/** Sanitize a full display name (same charset, higher length cap). */
export function sanitizeFullNameInput(value: string): string {
  return sanitizePersonNameInput(value, FULL_NAME_MAX_CHARS);
}

/** True when the name has at least one letter and only allowed characters. */
export function isValidPersonName(
  value: string,
  maxChars: number = PERSON_NAME_MAX_CHARS,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length < PERSON_NAME_MIN_CHARS || trimmed.length > maxChars) {
    return false;
  }
  if (!/\p{L}/u.test(trimmed)) {
    return false;
  }
  return /^[\p{L}\p{M}\s'.-]+$/u.test(trimmed);
}

/** True when a full name is present and within the full-name charset/length rules. */
export function isValidFullName(value: string): boolean {
  return isValidPersonName(value, FULL_NAME_MAX_CHARS);
}

/** ICE contact is usable when name, valid phone, and relationship are all present. */
export function isCompleteIceContact(
  contact: Pick<EmergencyContact, 'name' | 'phone' | 'relationship'>,
): boolean {
  return Boolean(
    contact.name.trim() &&
    isValidPersonName(contact.name) &&
    isValidIcePhone(contact.phone) &&
    contact.relationship.trim(),
  );
}

/** Profiles must keep at least one complete ICE contact (matches post-signup setup). */
export function hasRequiredIceContact(contacts: EmergencyContact[]): boolean {
  return contacts.some(isCompleteIceContact);
}
