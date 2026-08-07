import type { EmergencyContact, EmergencyProfile } from '@/types';

/** Non-empty trimmed string counts as set. */
export function isEmergencyTextSet(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Non-empty array counts as set (empty `[]` is unset / bootstrap shell). */
export function isEmergencyListSet(value: unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function mergeText(local: string | null | undefined, remote: string | null | undefined): string | null {
  if (isEmergencyTextSet(local)) {
    return local!.trim();
  }
  if (isEmergencyTextSet(remote)) {
    return remote!.trim();
  }
  return null;
}

function mergeFullName(local: string | undefined, remote: string | undefined): string {
  if (isEmergencyTextSet(local)) {
    return local!.trim();
  }
  if (isEmergencyTextSet(remote)) {
    return remote!.trim();
  }
  return '';
}

function mergeStringList(local: string[] | undefined, remote: string[] | undefined): string[] {
  if (isEmergencyListSet(local)) {
    return local!;
  }
  if (isEmergencyListSet(remote)) {
    return remote!;
  }
  return [];
}

function mergeContacts(
  local: EmergencyContact[] | undefined,
  remote: EmergencyContact[] | undefined,
): EmergencyContact[] {
  if (isEmergencyListSet(local)) {
    return local!;
  }
  if (isEmergencyListSet(remote)) {
    return remote!;
  }
  return [];
}

/**
 * Sign-in / rehydrate merge:
 * - Local empty + remote set → take remote
 * - Local set + remote empty → keep local
 * - Both set and differ → local wins
 *
 * When `local` is null (fresh wipe), the result is the remote profile.
 */
export function mergeEmergencyProfiles(
  local: EmergencyProfile | null,
  remote: EmergencyProfile,
): EmergencyProfile {
  if (!local) {
    return {
      ...remote,
      syncStatus: 'synced',
      deletedAt: null,
    };
  }

  return {
    id: remote.id || local.id,
    userId: remote.userId || local.userId,
    fullName: mergeFullName(local.fullName, remote.fullName),
    photoUrl: mergeText(local.photoUrl, remote.photoUrl),
    bloodGroup: mergeText(local.bloodGroup, remote.bloodGroup),
    genotype: mergeText(local.genotype, remote.genotype),
    allergies: mergeStringList(local.allergies, remote.allergies),
    currentMedications: mergeStringList(local.currentMedications, remote.currentMedications),
    chronicConditions: mergeStringList(local.chronicConditions, remote.chronicConditions),
    emergencyContacts: mergeContacts(local.emergencyContacts, remote.emergencyContacts),
    preferredHospital: mergeText(local.preferredHospital, remote.preferredHospital),
    insuranceProvider: mergeText(local.insuranceProvider, remote.insuranceProvider),
    notes: mergeText(local.notes, remote.notes),
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: local.createdAt || remote.createdAt,
    updatedAt:
      local.updatedAt && remote.updatedAt
        ? local.updatedAt > remote.updatedAt
          ? local.updatedAt
          : remote.updatedAt
        : remote.updatedAt || local.updatedAt,
  };
}
