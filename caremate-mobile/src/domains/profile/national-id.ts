import { z } from 'zod';

/** Nigeria National Identification Number length. */
export const NIGERIAN_NIN_LENGTH = 11;

/** Inclusive bounds for non-Nigeria national IDs. */
export const NATIONAL_ID_MIN_LENGTH = 5;
export const NATIONAL_ID_MAX_LENGTH = 32;

const NIGERIAN_NIN_PATTERN = /^\d{11}$/;
const GENERAL_NATIONAL_ID_PATTERN = /^[A-Za-z0-9]{5,32}$/;

export type NationalIdMessages = {
  ninInvalid: string;
  nationalIdInvalid: string;
};

export function isNigeriaCountry(countryCode: string | null | undefined): boolean {
  return (countryCode ?? '').toUpperCase() === 'NG';
}

/** Nigeria National Identification Number — empty or exactly 11 digits. */
export function isValidNigerianNin(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return NIGERIAN_NIN_PATTERN.test(value.trim());
}

export function isValidGeneralNationalId(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return GENERAL_NATIONAL_ID_PATTERN.test(value.trim());
}

/**
 * Optional national ID field.
 * - NG: empty or exactly 11 digits
 * - Other countries: empty or 5–32 alphanumeric characters (no spaces/symbols)
 */
export function createNationalIdSchema(
  countryCode: string | null | undefined,
  messages: NationalIdMessages,
) {
  const nigeria = isNigeriaCountry(countryCode);

  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) {
        return;
      }
      if (nigeria) {
        if (!NIGERIAN_NIN_PATTERN.test(value)) {
          ctx.addIssue({ code: 'custom', message: messages.ninInvalid });
        }
        return;
      }
      if (!GENERAL_NATIONAL_ID_PATTERN.test(value)) {
        ctx.addIssue({ code: 'custom', message: messages.nationalIdInvalid });
      }
    });
}

export function parseNationalId(
  value: string,
  countryCode: string | null | undefined,
  messages: NationalIdMessages,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const result = createNationalIdSchema(countryCode, messages).safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      message: result.error.issues[0]?.message ?? messages.nationalIdInvalid,
    };
  }
  const trimmed = result.data;
  return { ok: true, value: trimmed ? trimmed : null };
}

export function sanitizeNationalIdInput(value: string, countryCode: string | null): string {
  if (isNigeriaCountry(countryCode)) {
    return value.replace(/\D/g, '').slice(0, NIGERIAN_NIN_LENGTH);
  }
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, NATIONAL_ID_MAX_LENGTH);
}
