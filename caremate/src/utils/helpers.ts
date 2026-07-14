import * as Crypto from 'expo-crypto';

export async function createId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}
