import { and, desc, eq, isNull, notInArray } from 'drizzle-orm';

import { GUEST_USER_ID } from '@/constants/guest';
import { getDatabase } from '@/database/client';
import { userLocationSamples } from '@/database/schema';
import { useAuthStore } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { createId, nowIso } from '@/utils/helpers';

export const LOCATION_HISTORY_LIMIT = 20;

export type LocationSampleInput = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  mocked?: boolean | null;
  capturedAt?: string;
  source?: 'gps' | 'manual_enable';
};

export type LocationSample = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  mocked: boolean | null;
  capturedAt: string;
  source: string;
};

function mapSample(row: typeof userLocationSamples.$inferSelect): LocationSample {
  return {
    id: row.id,
    userId: row.userId,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    accuracy: row.accuracy,
    altitudeAccuracy: row.altitudeAccuracy,
    heading: row.heading,
    speed: row.speed,
    mocked: row.mocked,
    capturedAt: row.capturedAt,
    source: row.source,
  };
}

function toSyncPayload(sample: LocationSample) {
  return {
    id: sample.id,
    userId: sample.userId,
    latitude: sample.latitude,
    longitude: sample.longitude,
    altitude: sample.altitude,
    accuracy: sample.accuracy,
    altitudeAccuracy: sample.altitudeAccuracy,
    heading: sample.heading,
    speed: sample.speed,
    mocked: sample.mocked,
    capturedAt: sample.capturedAt,
    source: sample.source,
  };
}

class LocationSampleRepository extends BaseRepository {
  async recordSample(userId: string, input: LocationSampleInput): Promise<LocationSample> {
    const db = getDatabase();
    const timestamp = nowIso();
    const id = await createId();
    const capturedAt = input.capturedAt ?? timestamp;

    await db.insert(userLocationSamples).values({
      id,
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
      altitude: input.altitude ?? null,
      accuracy: input.accuracy ?? null,
      altitudeAccuracy: input.altitudeAccuracy ?? null,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      mocked: input.mocked ?? null,
      capturedAt,
      source: input.source ?? 'gps',
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.pruneToLimit(userId);

    const sample: LocationSample = {
      id,
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
      altitude: input.altitude ?? null,
      accuracy: input.accuracy ?? null,
      altitudeAccuracy: input.altitudeAccuracy ?? null,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      mocked: input.mocked ?? null,
      capturedAt,
      source: input.source ?? 'gps',
    };

    // Guests keep history local-only until sign-in migration.
    if (userId !== GUEST_USER_ID) {
      await this.queueSync({
        entityType: 'user_location_samples',
        entityId: id,
        operation: 'create',
        payload: toSyncPayload(sample),
      });
    }

    return sample;
  }

  async getLatest(userId: string): Promise<LocationSample | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(userLocationSamples)
      .where(and(eq(userLocationSamples.userId, userId), isNull(userLocationSamples.deletedAt)))
      .orderBy(desc(userLocationSamples.capturedAt))
      .limit(1);
    return row ? mapSample(row) : null;
  }

  async listRecent(userId: string, limit = LOCATION_HISTORY_LIMIT): Promise<LocationSample[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(userLocationSamples)
      .where(and(eq(userLocationSamples.userId, userId), isNull(userLocationSamples.deletedAt)))
      .orderBy(desc(userLocationSamples.capturedAt))
      .limit(limit);
    return rows.map(mapSample);
  }

  async pruneToLimit(userId: string, limit = LOCATION_HISTORY_LIMIT): Promise<void> {
    const db = getDatabase();
    const keep = await db
      .select({ id: userLocationSamples.id })
      .from(userLocationSamples)
      .where(and(eq(userLocationSamples.userId, userId), isNull(userLocationSamples.deletedAt)))
      .orderBy(desc(userLocationSamples.capturedAt))
      .limit(limit);

    const keepIds = keep.map((row) => row.id);
    if (keepIds.length === 0) {
      return;
    }

    const stale = await db
      .select({ id: userLocationSamples.id })
      .from(userLocationSamples)
      .where(
        and(
          eq(userLocationSamples.userId, userId),
          isNull(userLocationSamples.deletedAt),
          notInArray(userLocationSamples.id, keepIds),
        ),
      );

    if (stale.length === 0) {
      return;
    }

    for (const row of stale) {
      if (userId !== GUEST_USER_ID) {
        await this.queueSync({
          entityType: 'user_location_samples',
          entityId: row.id,
          operation: 'delete',
          payload: { id: row.id, userId },
        });
      }

      await db.delete(userLocationSamples).where(eq(userLocationSamples.id, row.id));
    }
  }

  /**
   * Reassign guest samples to a signed-in user and enqueue cloud sync.
   * Keeps the merged newest 20 across guest + user history.
   */
  async migrateGuestSamples(toUserId: string): Promise<void> {
    if (!toUserId || toUserId === GUEST_USER_ID) {
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();
    const guestRows = await db
      .select()
      .from(userLocationSamples)
      .where(
        and(eq(userLocationSamples.userId, GUEST_USER_ID), isNull(userLocationSamples.deletedAt)),
      );

    for (const row of guestRows) {
      await db
        .update(userLocationSamples)
        .set({
          userId: toUserId,
          syncStatus: 'pending',
          updatedAt: timestamp,
        })
        .where(eq(userLocationSamples.id, row.id));

      await this.queueSync({
        entityType: 'user_location_samples',
        entityId: row.id,
        operation: 'create',
        payload: toSyncPayload({
          ...mapSample(row),
          userId: toUserId,
        }),
      });
    }

    await this.pruneToLimit(toUserId);
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    const auth = useAuthStore.getState();
    if (auth.isGuest || !auth.user?.id || auth.user.id === GUEST_USER_ID) {
      return;
    }

    const db = getDatabase();

    if (operation === 'delete') {
      const { error } = await supabase.from('user_location_samples').delete().eq('id', entityId);
      if (error) {
        throw new Error(error.message);
      }
      await db.delete(userLocationSamples).where(eq(userLocationSamples.id, entityId));
      return;
    }

    const sample = payload as ReturnType<typeof toSyncPayload>;
    if (!sample?.id || sample.userId === GUEST_USER_ID) {
      return;
    }

    const { error } = await supabase.from('user_location_samples').upsert({
      id: sample.id,
      user_id: sample.userId,
      latitude: sample.latitude,
      longitude: sample.longitude,
      altitude: sample.altitude,
      accuracy: sample.accuracy,
      altitude_accuracy: sample.altitudeAccuracy,
      heading: sample.heading,
      speed: sample.speed,
      mocked: sample.mocked,
      captured_at: sample.capturedAt,
      source: sample.source,
      updated_at: nowIso(),
    });

    if (error) {
      throw new Error(error.message);
    }

    await supabase.rpc('prune_user_location_samples', { p_user_id: sample.userId });

    await db
      .update(userLocationSamples)
      .set({ syncStatus: 'synced', updatedAt: nowIso() })
      .where(eq(userLocationSamples.id, entityId));
  }

  async pullFromRemote(): Promise<void> {
    const auth = useAuthStore.getState();
    if (auth.isGuest || !auth.user?.id || auth.user.id === GUEST_USER_ID) {
      return;
    }

    const { data, error } = await supabase
      .from('user_location_samples')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('captured_at', { ascending: false })
      .limit(LOCATION_HISTORY_LIMIT);

    if (error || !Array.isArray(data)) {
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();

    for (const row of data) {
      await db
        .insert(userLocationSamples)
        .values({
          id: row.id,
          userId: row.user_id,
          latitude: row.latitude,
          longitude: row.longitude,
          altitude: row.altitude,
          accuracy: row.accuracy,
          altitudeAccuracy: row.altitude_accuracy,
          heading: row.heading,
          speed: row.speed,
          mocked: row.mocked,
          capturedAt: row.captured_at,
          source: row.source,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: userLocationSamples.id,
          set: {
            latitude: row.latitude,
            longitude: row.longitude,
            altitude: row.altitude,
            accuracy: row.accuracy,
            altitudeAccuracy: row.altitude_accuracy,
            heading: row.heading,
            speed: row.speed,
            mocked: row.mocked,
            capturedAt: row.captured_at,
            source: row.source,
            syncStatus: 'synced',
            deletedAt: null,
            updatedAt: timestamp,
          },
        });
    }

    await this.pruneToLimit(auth.user.id);
  }
}

export const locationSampleRepository = new LocationSampleRepository();
