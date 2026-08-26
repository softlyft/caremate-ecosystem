import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { buildHttpsAppLink, shouldPreferHttpsAppLinks } from '@/lib/app-links';
import { supabase } from '@/lib/supabase';
import type { EmergencyContact } from '@/types';

const PENDING_SHARE_TOKEN_KEY = 'caremate_pending_emergency_share_token';

/** URL-safe opaque token length (hex of 16 random bytes). */
export const EMERGENCY_SHARE_TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export type SharedEmergencyPayload = {
  fullName: string;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string[];
  currentMedications: string[];
  chronicConditions: string[];
  preferredHospital: string | null;
  insuranceProvider: string | null;
  notes: string | null;
  emergencyContacts: EmergencyContact[];
  hasProfile: boolean;
};

export function isValidEmergencyShareToken(token: string | null | undefined): boolean {
  return Boolean(token && EMERGENCY_SHARE_TOKEN_PATTERN.test(token));
}

export async function generateEmergencyShareToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * QR / deep-link URL. Prefers https Universal/App Links when the website host
 * is configured; otherwise falls back to `caremate://`.
 * Optional `version` (e.g. emergency profile `updatedAt`) refreshes the QR
 * bitmap when details change without rotating the opaque share token.
 */
export function buildEmergencyShareUrl(
  token: string,
  options?: { version?: string | null },
): string {
  const path = `emergency/share/${token}`;
  const version = options?.version?.trim();
  const query = version ? `?v=${encodeURIComponent(version)}` : '';
  if (shouldPreferHttpsAppLinks()) {
    return `${buildHttpsAppLink(path)}${query}`;
  }
  return `caremate://${path}${query}`;
}

/**
 * Extract share token from a CareMate deep link, Expo linking URL, or legacy JSON QR.
 */
export function parseEmergencyShareToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isValidEmergencyShareToken(trimmed)) {
    return trimmed.toLowerCase();
  }

  try {
    const asJson = JSON.parse(trimmed) as { type?: string; shareToken?: string };
    if (
      asJson?.type === 'caremate-emergency-share' &&
      isValidEmergencyShareToken(asJson.shareToken)
    ) {
      return asJson.shareToken!.toLowerCase();
    }
  } catch {
    // Not JSON — try URL forms.
  }

  const match = trimmed.match(/emergency\/share\/([a-f0-9]{32})/i);
  if (match?.[1] && isValidEmergencyShareToken(match[1])) {
    return match[1].toLowerCase();
  }

  return null;
}

export async function stashPendingEmergencyShareToken(token: string): Promise<void> {
  if (!isValidEmergencyShareToken(token)) return;
  await AsyncStorage.setItem(PENDING_SHARE_TOKEN_KEY, token.toLowerCase());
}

export async function takePendingEmergencyShareToken(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_SHARE_TOKEN_KEY);
  await AsyncStorage.removeItem(PENDING_SHARE_TOKEN_KEY);
  return isValidEmergencyShareToken(value) ? value!.toLowerCase() : null;
}

export async function peekPendingEmergencyShareToken(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_SHARE_TOKEN_KEY);
  return isValidEmergencyShareToken(value) ? value!.toLowerCase() : null;
}

export class EmergencyShareAccessError extends Error {
  readonly code: 'auth_required' | 'practitioner_required';

  constructor(code: 'auth_required' | 'practitioner_required', message: string) {
    super(message);
    this.name = 'EmergencyShareAccessError';
    this.code = code;
  }
}

export function isEmergencyShareAccessError(err: unknown): err is EmergencyShareAccessError {
  return err instanceof EmergencyShareAccessError;
}

export async function fetchEmergencyByShareToken(
  token: string,
): Promise<SharedEmergencyPayload | null> {
  if (!isValidEmergencyShareToken(token)) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_emergency_by_share_token', {
    p_token: token.toLowerCase(),
  });

  if (error) {
    const message = error.message ?? '';
    const lower = message.toLowerCase();
    if (lower.includes('authentication required')) {
      throw new EmergencyShareAccessError('auth_required', message);
    }
    if (
      lower.includes('health practitioner') ||
      lower.includes('only signed-in health practitioners')
    ) {
      throw new EmergencyShareAccessError('practitioner_required', message);
    }
    throw new Error(message || 'Failed to load emergency share');
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  const row = data as Record<string, unknown>;
  if (row.found === false) {
    return null;
  }

  const contactsRaw = Array.isArray(row.emergency_contacts) ? row.emergency_contacts : [];
  const emergencyContacts: EmergencyContact[] = contactsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const c = item as Record<string, unknown>;
      return {
        name: typeof c.name === 'string' ? c.name : '',
        phone: typeof c.phone === 'string' ? c.phone : '',
        relationship: typeof c.relationship === 'string' ? c.relationship : '',
      };
    })
    .filter((c): c is EmergencyContact => Boolean(c && c.name.trim()));

  return {
    fullName: typeof row.full_name === 'string' ? row.full_name : '',
    bloodGroup: typeof row.blood_group === 'string' ? row.blood_group : null,
    genotype: typeof row.genotype === 'string' ? row.genotype : null,
    allergies: Array.isArray(row.allergies)
      ? row.allergies.filter((v): v is string => typeof v === 'string')
      : [],
    currentMedications: Array.isArray(row.current_medications)
      ? row.current_medications.filter((v): v is string => typeof v === 'string')
      : [],
    chronicConditions: Array.isArray(row.chronic_conditions)
      ? row.chronic_conditions.filter((v): v is string => typeof v === 'string')
      : [],
    preferredHospital: typeof row.preferred_hospital === 'string' ? row.preferred_hospital : null,
    insuranceProvider: typeof row.insurance_provider === 'string' ? row.insurance_provider : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    emergencyContacts,
    hasProfile: row.has_profile === true,
  };
}
