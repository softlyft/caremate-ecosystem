import * as Crypto from 'expo-crypto';

const PATIENT_ID_LENGTH = 12;
const PATIENT_ID_PATTERN = /^\d{12}$/;

/** Format 12-digit ID as `XXXX XXXX XXXX` for display. */
export function formatPatientId(patientId: string | null | undefined): string {
  if (!patientId || !PATIENT_ID_PATTERN.test(patientId)) {
    return '';
  }
  return `${patientId.slice(0, 4)} ${patientId.slice(4, 8)} ${patientId.slice(8, 12)}`;
}

export function isValidPatientId(value: string | null | undefined): boolean {
  return Boolean(value && PATIENT_ID_PATTERN.test(value));
}

/**
 * Cryptographically random 12-digit CareMate Patient ID.
 * Uniform over 10^12 values (leading zeros allowed so the space is full).
 */
export async function generatePatientIdDigits(): Promise<string> {
  // Rejection sampling keeps each digit uniform without modulo bias.
  const digits: string[] = [];
  while (digits.length < PATIENT_ID_LENGTH) {
    const bytes = await Crypto.getRandomBytesAsync(16);
    for (const byte of bytes) {
      if (byte > 249) continue; // 250–255 not divisible cleanly into 0–9
      digits.push(String(byte % 10));
      if (digits.length === PATIENT_ID_LENGTH) break;
    }
  }
  return digits.join('');
}
