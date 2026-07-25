import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** Ciphertext envelope prefix used by the gateway field cipher. */
export const FIELD_CIPHER_PREFIX = 'v1:';

/**
 * AES-256-GCM field cipher.
 * Envelope: v1:<iv_b64>:<tag_b64>:<cipher_b64>
 */
export function encryptField(plaintext: string, dek: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dek, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    FIELD_CIPHER_PREFIX.slice(0, -1),
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptField(payload: string, dek: Buffer): string {
  if (!isEncryptedEnvelope(payload)) {
    return payload;
  }

  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid ciphertext envelope');
  }

  const [, ivB64, tagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ciphertext = Buffer.from(cipherB64, 'base64url');

  const decipher = createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncryptedEnvelope(value: string): boolean {
  return value.startsWith(FIELD_CIPHER_PREFIX);
}

export function wrapDek(dek: Buffer, masterKey: Buffer): string {
  return encryptField(dek.toString('base64url'), masterKey);
}

export function unwrapDek(wrappedDek: string, masterKey: Buffer): Buffer {
  const dekB64 = decryptField(wrappedDek, masterKey);
  return Buffer.from(dekB64, 'base64url');
}

export function generateDek(): Buffer {
  return randomBytes(32);
}

export function parseMasterKey(raw: string): Buffer {
  const trimmed = raw.trim();
  // Prefer base64url / base64 32-byte keys; fall back to utf8 hashed length check.
  try {
    const fromB64 = Buffer.from(trimmed, 'base64');
    if (fromB64.length === 32) {
      return fromB64;
    }
  } catch {
    // continue
  }

  const utf8 = Buffer.from(trimmed, 'utf8');
  if (utf8.length === 32) {
    return utf8;
  }

  throw new Error(
    'GATEWAY_MASTER_KEY must be a 32-byte key (base64 or raw utf8)',
  );
}
