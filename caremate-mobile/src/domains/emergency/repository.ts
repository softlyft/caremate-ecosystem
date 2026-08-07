import { and, eq, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { emergencyProfiles } from '@/database/schema';
import { mergeEmergencyProfiles } from '@/domains/emergency/merge-emergency';
import {
  fetchEmergencyViaGateway,
  isHealthDataGatewayConfigured,
  scrubEncryptedJson,
  scrubEncryptedText,
  upsertEmergencyViaGateway,
  type GatewayEmergencyRow,
} from '@/domains/health-data-gateway';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { toJson } from '@/sync/cloud-types';
import type { EmergencyContact, EmergencyProfile } from '@/types';
import { createId, nowIso, parseJsonArray, stringifyJson } from '@/utils/helpers';

type RemoteEmergencyRow = GatewayEmergencyRow & {
  created_at?: string | null;
  updated_at?: string | null;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return parseJsonArray<string>(value);
  }
  return [];
}

function asEmergencyContacts(value: unknown): EmergencyContact[] {
  if (typeof value === 'string') {
    return parseJsonArray<EmergencyContact>(value);
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name : '';
      const phone = typeof row.phone === 'string' ? row.phone : '';
      const relationship = typeof row.relationship === 'string' ? row.relationship : '';
      if (!name.trim()) {
        return null;
      }
      return { name, phone, relationship };
    })
    .filter((contact): contact is EmergencyContact => contact != null);
}

function scrubRemoteEmergencyRow(row: RemoteEmergencyRow): RemoteEmergencyRow {
  return {
    ...row,
    blood_group: scrubEncryptedText(row.blood_group),
    genotype: scrubEncryptedText(row.genotype),
    allergies: scrubEncryptedJson(row.allergies),
    current_medications: scrubEncryptedJson(row.current_medications),
    chronic_conditions: scrubEncryptedJson(row.chronic_conditions),
    emergency_contacts: scrubEncryptedJson(row.emergency_contacts),
    preferred_hospital: scrubEncryptedText(row.preferred_hospital),
    insurance_provider: scrubEncryptedText(row.insurance_provider),
    notes: scrubEncryptedText(row.notes),
  };
}

function mapEmergencyProfile(row: typeof emergencyProfiles.$inferSelect): EmergencyProfile {
  return {
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    photoUrl: row.photoUrl,
    bloodGroup: row.bloodGroup,
    genotype: row.genotype,
    allergies: parseJsonArray<string>(row.allergies),
    currentMedications: parseJsonArray<string>(row.currentMedications),
    chronicConditions: parseJsonArray<string>(row.chronicConditions),
    emergencyContacts: parseJsonArray(row.emergencyContacts),
    preferredHospital: row.preferredHospital,
    insuranceProvider: row.insuranceProvider,
    notes: row.notes,
    syncStatus: row.syncStatus as EmergencyProfile['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function remoteRowToProfile(row: RemoteEmergencyRow): EmergencyProfile {
  const timestamp = nowIso();
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name ?? '',
    photoUrl: row.photo_url ?? null,
    bloodGroup: row.blood_group ?? null,
    genotype: row.genotype ?? null,
    allergies: asStringList(row.allergies),
    currentMedications: asStringList(row.current_medications),
    chronicConditions: asStringList(row.chronic_conditions),
    emergencyContacts: asEmergencyContacts(row.emergency_contacts),
    preferredHospital: row.preferred_hospital ?? null,
    insuranceProvider: row.insurance_provider ?? null,
    notes: row.notes ?? null,
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: row.created_at ?? timestamp,
    updatedAt: row.updated_at ?? timestamp,
  };
}

class EmergencyRepository extends BaseRepository {
  async findByUserId(userId: string): Promise<EmergencyProfile | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(emergencyProfiles)
      .where(and(eq(emergencyProfiles.userId, userId), isNull(emergencyProfiles.deletedAt)))
      .limit(1);
    return row ? mapEmergencyProfile(row) : null;
  }

  /**
   * Create a local empty emergency shell without queueing sync.
   * Used by signup/bootstrap so we never push empty PHI over a richer cloud row.
   */
  async ensureLocalShell(
    userId: string,
    input: { fullName?: string } = {},
  ): Promise<EmergencyProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const timestamp = nowIso();
    const id = await createId();
    const profile: EmergencyProfile = {
      id,
      userId,
      fullName: input.fullName?.trim() ?? '',
      photoUrl: null,
      bloodGroup: null,
      genotype: null,
      allergies: [],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
      preferredHospital: null,
      insuranceProvider: null,
      notes: null,
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.writeLocalSynced(profile);
    return profile;
  }

  /**
   * Sign-in hydrate: fetch cloud emergency, merge with local (local set wins;
   * remote fills blanks), write as synced without queueing a push.
   */
  async hydrateFromRemote(userId: string): Promise<void> {
    const remote = await this.fetchRemoteForUser(userId);
    if (!remote) {
      return;
    }

    const local = await this.findByUserId(userId);
    // Real in-flight edits still win entirely — don't merge over pending local.
    if (local?.syncStatus === 'pending') {
      const pendingIds = await this.pendingEmergencySyncIds();
      if (pendingIds.has(local.id) || pendingIds.size > 0) {
        return;
      }
    }

    const merged = mergeEmergencyProfiles(local, remote);
    if (local && local.id !== merged.id) {
      await this.remapLocalId(local.id, merged.id);
    }
    await this.writeLocalSynced(merged);
  }

  async save(userId: string, input: Partial<EmergencyProfile>): Promise<EmergencyProfile> {
    const db = getDatabase();
    const existing = await this.findByUserId(userId);
    const timestamp = nowIso();

    if (existing) {
      const updated: EmergencyProfile = {
        ...existing,
        ...input,
        updatedAt: timestamp,
        syncStatus: 'pending',
      };

      await db
        .update(emergencyProfiles)
        .set({
          fullName: updated.fullName,
          photoUrl: updated.photoUrl,
          bloodGroup: updated.bloodGroup,
          genotype: updated.genotype,
          allergies: stringifyJson(updated.allergies),
          currentMedications: stringifyJson(updated.currentMedications),
          chronicConditions: stringifyJson(updated.chronicConditions),
          emergencyContacts: stringifyJson(updated.emergencyContacts),
          preferredHospital: updated.preferredHospital,
          insuranceProvider: updated.insuranceProvider,
          notes: updated.notes,
          syncStatus: 'pending',
          updatedAt: timestamp,
        })
        .where(eq(emergencyProfiles.id, existing.id));

      await this.queueSync({
        entityType: 'emergency_profiles',
        entityId: existing.id,
        operation: 'update',
        payload: updated,
      });

      return updated;
    }

    const id = await createId();
    const profile: EmergencyProfile = {
      id,
      userId,
      fullName: input.fullName ?? '',
      photoUrl: input.photoUrl ?? null,
      bloodGroup: input.bloodGroup ?? null,
      genotype: input.genotype ?? null,
      allergies: input.allergies ?? [],
      currentMedications: input.currentMedications ?? [],
      chronicConditions: input.chronicConditions ?? [],
      emergencyContacts: input.emergencyContacts ?? [],
      preferredHospital: input.preferredHospital ?? null,
      insuranceProvider: input.insuranceProvider ?? null,
      notes: input.notes ?? null,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(emergencyProfiles).values({
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      photoUrl: profile.photoUrl,
      bloodGroup: profile.bloodGroup,
      genotype: profile.genotype,
      allergies: stringifyJson(profile.allergies),
      currentMedications: stringifyJson(profile.currentMedications),
      chronicConditions: stringifyJson(profile.chronicConditions),
      emergencyContacts: stringifyJson(profile.emergencyContacts),
      preferredHospital: profile.preferredHospital,
      insuranceProvider: profile.insuranceProvider,
      notes: profile.notes,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'emergency_profiles',
      entityId: profile.id,
      operation: 'create',
      payload: profile,
    });

    return profile;
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      const { error } = await supabase.from('emergency_profiles').delete().eq('id', entityId);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const profile = payload as EmergencyProfile;

    const gatewayRow = await upsertEmergencyViaGateway(profile);
    if (gatewayRow) {
      await this.alignLocalAfterRemoteWrite(profile, gatewayRow.id);
      return;
    }

    // One emergency profile per user — reuse the remote primary key when it already exists.
    // Upserting a fresh local `id` against an existing `user_id` row fails unique(user_id);
    // previously that error was ignored and the queue still marked the op complete.
    const { data: existing, error: lookupError } = await supabase
      .from('emergency_profiles')
      .select('id')
      .eq('user_id', profile.userId)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    const remoteId = existing?.id ?? profile.id;
    const { error } = await supabase.from('emergency_profiles').upsert({
      id: remoteId,
      user_id: profile.userId,
      full_name: profile.fullName,
      photo_url: profile.photoUrl,
      blood_group: profile.bloodGroup,
      genotype: profile.genotype,
      allergies: toJson(profile.allergies),
      current_medications: toJson(profile.currentMedications),
      chronic_conditions: toJson(profile.chronicConditions),
      emergency_contacts: toJson(profile.emergencyContacts),
      preferred_hospital: profile.preferredHospital,
      insurance_provider: profile.insuranceProvider,
      notes: profile.notes,
      updated_at: profile.updatedAt,
    });

    if (error) {
      throw new Error(error.message);
    }

    await this.alignLocalAfterRemoteWrite(profile, remoteId);
  }

  async pullFromRemote(): Promise<void> {
    const pendingIds = await this.pendingEmergencySyncIds();
    // Don't clobber in-flight local edits (same class of bug as favorite toggles).
    if (pendingIds.size > 0) {
      return;
    }

    const data = await this.fetchAllRemoteRows();
    if (!data) {
      return;
    }

    for (const row of data) {
      const existingLocal = await this.findByUserId(row.user_id);
      if (existingLocal?.syncStatus === 'pending') {
        continue;
      }

      const remoteProfile = remoteRowToProfile(row);
      // Fill blanks from remote; keep meaningfully set local fields.
      const merged = mergeEmergencyProfiles(existingLocal, remoteProfile);

      if (existingLocal && existingLocal.id !== merged.id) {
        await this.remapLocalId(existingLocal.id, merged.id);
      }

      await this.writeLocalSynced(merged);
    }
  }

  private async fetchRemoteForUser(userId: string): Promise<EmergencyProfile | null> {
    const rows = await this.fetchAllRemoteRows();
    if (!rows) {
      return null;
    }
    const row = rows.find((item) => item.user_id === userId) ?? rows[0] ?? null;
    return row ? remoteRowToProfile(row) : null;
  }

  private async fetchAllRemoteRows(): Promise<RemoteEmergencyRow[] | null> {
    const gatewayRow = await fetchEmergencyViaGateway();
    if (gatewayRow) {
      return [gatewayRow];
    }
    if (isHealthDataGatewayConfigured()) {
      // Gateway is the source of truth when configured; no plaintext Supabase pull.
      return null;
    }

    const { data: remote, error } = await supabase.from('emergency_profiles').select('*');
    if (error || !remote) {
      return null;
    }
    return remote.map((row) => scrubRemoteEmergencyRow(row as RemoteEmergencyRow));
  }

  private async writeLocalSynced(profile: EmergencyProfile): Promise<void> {
    const db = getDatabase();
    await db
      .insert(emergencyProfiles)
      .values({
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        photoUrl: profile.photoUrl,
        bloodGroup: profile.bloodGroup,
        genotype: profile.genotype,
        allergies: stringifyJson(profile.allergies),
        currentMedications: stringifyJson(profile.currentMedications),
        chronicConditions: stringifyJson(profile.chronicConditions),
        emergencyContacts: stringifyJson(profile.emergencyContacts),
        preferredHospital: profile.preferredHospital,
        insuranceProvider: profile.insuranceProvider,
        notes: profile.notes,
        syncStatus: 'synced',
        deletedAt: null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      })
      .onConflictDoUpdate({
        target: emergencyProfiles.id,
        set: {
          fullName: profile.fullName,
          photoUrl: profile.photoUrl,
          bloodGroup: profile.bloodGroup,
          genotype: profile.genotype,
          allergies: stringifyJson(profile.allergies),
          currentMedications: stringifyJson(profile.currentMedications),
          chronicConditions: stringifyJson(profile.chronicConditions),
          emergencyContacts: stringifyJson(profile.emergencyContacts),
          preferredHospital: profile.preferredHospital,
          insuranceProvider: profile.insuranceProvider,
          notes: profile.notes,
          syncStatus: 'synced',
          updatedAt: profile.updatedAt,
        },
      });
  }

  private async pendingEmergencySyncIds(): Promise<Set<string>> {
    const { getPendingSyncOperations } = await import('@/sync/queue');
    const pending = await getPendingSyncOperations();
    return new Set(
      pending
        .filter((item) => item.entityType === 'emergency_profiles')
        .map((item) => item.entityId),
    );
  }

  private async alignLocalAfterRemoteWrite(
    profile: EmergencyProfile,
    remoteId: string,
  ): Promise<void> {
    if (remoteId !== profile.id) {
      await this.remapLocalId(profile.id, remoteId);
    }
    await this.markLocalSynced(remoteId);
  }

  private async markLocalSynced(id: string): Promise<void> {
    const db = getDatabase();
    await db
      .update(emergencyProfiles)
      .set({ syncStatus: 'synced', updatedAt: nowIso() })
      .where(eq(emergencyProfiles.id, id));
  }

  private async remapLocalId(fromId: string, toId: string): Promise<void> {
    if (fromId === toId) {
      return;
    }

    const db = getDatabase();
    const [source] = await db
      .select()
      .from(emergencyProfiles)
      .where(eq(emergencyProfiles.id, fromId))
      .limit(1);
    if (!source) {
      return;
    }

    const [collision] = await db
      .select()
      .from(emergencyProfiles)
      .where(eq(emergencyProfiles.id, toId))
      .limit(1);
    if (collision) {
      await db.delete(emergencyProfiles).where(eq(emergencyProfiles.id, toId));
    }

    await db.update(emergencyProfiles).set({ id: toId }).where(eq(emergencyProfiles.id, fromId));
  }
}

export const emergencyRepository = new EmergencyRepository();
