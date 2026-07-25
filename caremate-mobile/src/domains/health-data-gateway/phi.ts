/** Field-level ciphertext envelope written by the Health Data Gateway. */
export const FIELD_CIPHER_PREFIX = 'v1:';

export function isEncryptedEnvelope(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(FIELD_CIPHER_PREFIX);
}

/** Drop ciphertext so offline SQLite never stores opaque gateway envelopes as "plaintext". */
export function scrubEncryptedText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (isEncryptedEnvelope(value)) {
    return null;
  }
  return typeof value === 'string' ? value : String(value);
}

export function scrubEncryptedJson(value: unknown): unknown {
  if (isEncryptedEnvelope(value)) {
    return [];
  }
  return value ?? [];
}
