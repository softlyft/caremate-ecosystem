import { FIELD_CIPHER_PREFIX } from './phi-fields';

/**
 * Dot paths into a mini-app Zustand payload.
 * `*` matches any object key or array index.
 * Only leaf values at these paths are encrypted — structure / “who” ids stay plaintext.
 */
export const MINI_APP_PHI_PATHS = {
  medication: [
    'medications.*.name',
    'medications.*.dosage',
    'medications.*.notes',
    'medications.*.patientName',
    'medications.*.startDate',
    'medications.*.endDate',
    'medications.*.slotTimes.*',
    'medications.*.instructions.text',
    'medications.*.quantityRemaining',
    'medications.*.refillAtThreshold',
    'medications.*.refillDueDate',
    'logs.*.notes',
    'logs.*.takenAt',
    'logs.*.dateKey',
  ],
  vitals: [
    'entries.*.value',
    'entries.*.systolic',
    'entries.*.diastolic',
    'entries.*.feet',
    'entries.*.inches',
    'entries.*.notes',
    'entries.*.recordedAt',
  ],
  checkup: [
    'profile.dateOfBirth',
    'profile.gender',
    'profile.regionCode',
    'completions.*.completedDate',
    'completions.*.notes',
  ],
  immunization: [
    'profiles.*.name',
    'profiles.*.dateOfBirth',
    'records.*.administeredDate',
    'records.*.notes',
    'records.*.provider',
  ],
  pregnancy: [
    'lastMenstrualPeriod',
    'dueDate',
    'babyNickname',
    'dailyLogs.*.dateKey',
    'dailyLogs.*.mood',
    'dailyLogs.*.symptoms.*',
    'dailyLogs.*.kickCount',
    'dailyLogs.*.notes',
    'dailyLogs.*.weightKg',
  ],
  period: [
    'cycleLength',
    'periodLength',
    'loggedPeriodDays.*',
    'lastPeriodStart',
    'pausedReason',
  ],
} as const;

export type MiniAppPhiKey = keyof typeof MINI_APP_PHI_PATHS;

export function isMiniAppPhiKey(value: string): value is MiniAppPhiKey {
  return Object.prototype.hasOwnProperty.call(MINI_APP_PHI_PATHS, value);
}

export function getMiniAppPhiPaths(appKey: string): readonly string[] {
  if (!isMiniAppPhiKey(appKey)) {
    return [];
  }
  return MINI_APP_PHI_PATHS[appKey];
}

type LeafMapper = (leaf: unknown) => unknown;

function pathMatches(patternParts: string[], pathParts: string[]): boolean {
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  for (let i = 0; i < patternParts.length; i += 1) {
    const pattern = patternParts[i];
    if (pattern === '*') {
      continue;
    }
    if (pattern !== pathParts[i]) {
      return false;
    }
  }
  return true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-clone `value`, mapping only leaves whose path matches one of `paths`.
 * Object keys (e.g. pregnancy `dailyLogs` date keys) and structural ids are not mapped.
 */
export function mapPayloadPhiLeaves(
  value: unknown,
  paths: readonly string[],
  mapLeaf: LeafMapper,
): unknown {
  if (paths.length === 0) {
    return value;
  }
  const compiled = paths.map((path) => path.split('.'));

  const walk = (node: unknown, pathParts: string[]): unknown => {
    const matched = compiled.some((pattern) => pathMatches(pattern, pathParts));
    if (matched) {
      if (node == null || node === '') {
        return node;
      }
      return mapLeaf(node);
    }

    if (Array.isArray(node)) {
      return node.map((item, index) =>
        walk(item, [...pathParts, String(index)]),
      );
    }

    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(node)) {
        out[key] = walk(child, [...pathParts, key]);
      }
      return out;
    }

    return node;
  };

  return walk(value, []);
}

/** Encode a leaf so numbers/booleans/arrays round-trip through string ciphertext. */
export function encodePhiLeaf(value: unknown): string {
  return JSON.stringify(value);
}

export function decodePhiLeaf(plaintext: string): unknown {
  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

export function isEncryptedPhiLeaf(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(FIELD_CIPHER_PREFIX);
}

/**
 * Drop ciphertext leaves so a direct Supabase pull never hydrates opaque envelopes
 * into Zustand as if they were plaintext clinical values.
 */
export function scrubPayloadPhiLeaves(
  value: unknown,
  paths: readonly string[],
): unknown {
  return mapPayloadPhiLeaves(value, paths, (leaf) => {
    if (isEncryptedPhiLeaf(leaf)) {
      return null;
    }
    return leaf;
  });
}
