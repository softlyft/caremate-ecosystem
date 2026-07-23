import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { authStorage } from '@/lib/storage';

/** SecureStore / AsyncStorage key for the SQLCipher raw key (hex). */
export const SQLITE_ENCRYPTION_KEY_STORAGE = 'caremate_sqlite_cipher_key_v1';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function isNativeMobile(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isHexKey(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value);
}

/**
 * SQLCipher raw-key PRAGMA. Prefer x'..' so the key is never a SQL string literal
 * that needs quote escaping.
 */
export function buildSqlCipherKeyPragma(hexKey: string): string {
  if (!isHexKey(hexKey)) {
    throw new Error('SQLite encryption key must be 32-byte hex');
  }
  return `PRAGMA key = "x'${hexKey.toLowerCase()}'";`;
}

async function readStoredKey(): Promise<string | null> {
  if (isNativeMobile()) {
    return SecureStore.getItemAsync(SQLITE_ENCRYPTION_KEY_STORAGE, SECURE_STORE_OPTIONS);
  }
  return authStorage.getItem(SQLITE_ENCRYPTION_KEY_STORAGE);
}

async function writeStoredKey(hexKey: string): Promise<void> {
  if (isNativeMobile()) {
    await SecureStore.setItemAsync(SQLITE_ENCRYPTION_KEY_STORAGE, hexKey, SECURE_STORE_OPTIONS);
    return;
  }
  await authStorage.setItem(SQLITE_ENCRYPTION_KEY_STORAGE, hexKey);
}

/**
 * Returns a stable per-install SQLCipher key from the Keychain / Keystore.
 * Created once and reused for the life of the install.
 */
export async function getOrCreateSqliteEncryptionKey(): Promise<string> {
  const existing = await readStoredKey();
  if (existing && isHexKey(existing)) {
    return existing.toLowerCase();
  }

  const bytes = await Crypto.getRandomBytesAsync(32);
  const hexKey = bytesToHex(bytes);
  await writeStoredKey(hexKey);
  return hexKey;
}

/** Native iOS/Android builds with useSQLCipher; web stays unencrypted. */
export function shouldEncryptSqlite(): boolean {
  return isNativeMobile();
}
