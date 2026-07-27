import {
  decodePhiLeaf,
  encodePhiLeaf,
  getMiniAppPhiPaths,
  isEncryptedPhiLeaf,
  mapPayloadPhiLeaves,
} from '../../common/src/phi/mini-app-phi';
import { decryptField, encryptField } from './field-cipher';

/**
 * Encrypt PHI leaf values inside a mini-app snapshot payload.
 * Structure / identity keys stay plaintext JSON.
 */
export function encryptMiniAppPayload(
  appKey: string,
  payload: Record<string, unknown>,
  dek: Buffer,
): Record<string, unknown> {
  const paths = getMiniAppPhiPaths(appKey);
  const next = mapPayloadPhiLeaves(payload, paths, (leaf) => {
    if (leaf == null || leaf === '') {
      return leaf;
    }
    if (isEncryptedPhiLeaf(leaf)) {
      return leaf;
    }
    return encryptField(encodePhiLeaf(leaf), dek);
  });
  return (isPlainObject(next) ? next : {}) as Record<string, unknown>;
}

export function decryptMiniAppPayload(
  appKey: string,
  payload: Record<string, unknown>,
  dek: Buffer,
): Record<string, unknown> {
  const paths = getMiniAppPhiPaths(appKey);
  const next = mapPayloadPhiLeaves(payload, paths, (leaf) => {
    if (leaf == null || leaf === '') {
      return leaf;
    }
    if (typeof leaf !== 'string') {
      // Legacy plaintext non-string leaf (number etc.) before gateway cutover.
      return leaf;
    }
    if (!isEncryptedPhiLeaf(leaf)) {
      return leaf;
    }
    return decodePhiLeaf(decryptField(leaf, dek));
  });
  return (isPlainObject(next) ? next : {}) as Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
