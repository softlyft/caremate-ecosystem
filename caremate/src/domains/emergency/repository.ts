import { and, eq, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { emergencyProfiles } from '@/database/schema';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { toJson } from '@/sync/cloud-types';
import type { EmergencyProfile } from '@/types';
import { createId, nowIso, parseJsonArray, stringifyJson } from '@/utils/helpers';

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
      await supabase.from('emergency_profiles').delete().eq('id', entityId);
      return;
    }

    const profile = payload as EmergencyProfile;
    await supabase.from('emergency_profiles').upsert({
      id: profile.id,
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
  }

  async pullFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('emergency_profiles').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      const timestamp = nowIso();
      await db
        .insert(emergencyProfiles)
        .values({
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name,
          photoUrl: row.photo_url,
          bloodGroup: row.blood_group,
          genotype: row.genotype,
          allergies: stringifyJson(row.allergies ?? []),
          currentMedications: stringifyJson(row.current_medications ?? []),
          chronicConditions: stringifyJson(row.chronic_conditions ?? []),
          emergencyContacts: stringifyJson(row.emergency_contacts ?? []),
          preferredHospital: row.preferred_hospital,
          insuranceProvider: row.insurance_provider,
          notes: row.notes,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: emergencyProfiles.id,
          set: {
            fullName: row.full_name,
            photoUrl: row.photo_url,
            bloodGroup: row.blood_group,
            genotype: row.genotype,
            allergies: stringifyJson(row.allergies ?? []),
            currentMedications: stringifyJson(row.current_medications ?? []),
            chronicConditions: stringifyJson(row.chronic_conditions ?? []),
            emergencyContacts: stringifyJson(row.emergency_contacts ?? []),
            preferredHospital: row.preferred_hospital,
            insuranceProvider: row.insurance_provider,
            notes: row.notes,
            syncStatus: 'synced',
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const emergencyRepository = new EmergencyRepository();
