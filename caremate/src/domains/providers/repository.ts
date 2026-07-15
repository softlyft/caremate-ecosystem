import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { providers } from '@/database/schema';
import { getLegacyProviderIds, getProviderSeeds } from '@/domains/providers/utils/fhir-providers';
import { useAuthStore } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { toJson } from '@/sync/cloud-types';
import type { Provider, ProviderType } from '@/types';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';

function mapProvider(row: typeof providers.$inferSelect): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProviderType,
    address: row.address,
    phone: row.phone,
    email: row.email,
    latitude: row.latitude,
    longitude: row.longitude,
    isFavorite: row.isFavorite,
    distanceKm: row.distanceKm,
    attributes: parseJson<Record<string, unknown>>(row.attributes, {}),
    syncStatus: row.syncStatus as Provider['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class ProviderRepository extends BaseRepository {
  async seedIfEmpty(): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const seeds = getProviderSeeds();
    if (seeds.length === 0) {
      return;
    }

    const [existingSeed] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.id, seeds[0].id))
      .limit(1);

    if (!existingSeed) {
      for (const provider of seeds) {
        await db.insert(providers).values({
          ...provider,
          attributes: stringifyJson(provider.attributes ?? {}),
          isFavorite: false,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    const legacyIds = getLegacyProviderIds();
    if (legacyIds.length > 0) {
      await db
        .update(providers)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(inArray(providers.id, [...legacyIds]));
    }
  }

  async findAll(filters?: {
    type?: ProviderType;
    favoritesOnly?: boolean;
    search?: string;
  }): Promise<Provider[]> {
    const db = getDatabase();
    let rows = await db.select().from(providers).where(isNull(providers.deletedAt));

    if (filters?.type) {
      rows = rows.filter((row) => row.type === filters.type);
    }

    if (filters?.favoritesOnly) {
      rows = rows.filter((row) => row.isFavorite);
    }

    const term = filters?.search?.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) => {
        const haystacks = [row.name, row.address, row.phone, row.email, row.type];
        return haystacks.some((value) => value?.toLowerCase().includes(term));
      });
    }

    return rows.map(mapProvider).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  async findById(id: string): Promise<Provider | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(providers)
      .where(and(eq(providers.id, id), isNull(providers.deletedAt)))
      .limit(1);
    return row ? mapProvider(row) : null;
  }

  async toggleFavorite(id: string): Promise<Provider | null> {
    const db = getDatabase();
    const provider = await this.findById(id);
    if (!provider) {
      return null;
    }

    const timestamp = nowIso();
    const updated = {
      ...provider,
      isFavorite: !provider.isFavorite,
      updatedAt: timestamp,
      syncStatus: 'pending' as const,
    };

    await db
      .update(providers)
      .set({
        isFavorite: updated.isFavorite,
        syncStatus: 'pending',
        updatedAt: timestamp,
      })
      .where(eq(providers.id, id));

    await this.queueSync({
      entityType: 'providers',
      entityId: id,
      operation: 'update',
      payload: updated,
    });

    return updated;
  }

  async syncToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    const auth = useAuthStore.getState();
    const userId = auth.user?.id;
    if (!userId || auth.isGuest) {
      return;
    }

    if (operation === 'delete') {
      await supabase
        .from('provider_favorites')
        .delete()
        .eq('provider_id', entityId)
        .eq('user_id', userId);
      return;
    }

    const provider = payload as Provider;

    // Ensure a catalog stub exists so favorites remain meaningful across devices.
    // Uses SECURITY DEFINER RPC — direct catalog INSERT is staff-only (admin portal).
    const { error: stubError } = await supabase.rpc('ensure_provider_catalog_stub', {
      p_id: provider.id,
      p_name: provider.name,
      p_type: provider.type,
      p_address: provider.address,
      p_phone: provider.phone,
      p_email: provider.email,
      p_latitude: provider.latitude,
      p_longitude: provider.longitude,
      p_distance_km: provider.distanceKm,
      p_attributes: toJson(provider.attributes ?? {}),
      p_updated_at: provider.updatedAt,
    });
    if (stubError) {
      throw stubError;
    }

    if (!provider.isFavorite) {
      await supabase
        .from('provider_favorites')
        .delete()
        .eq('provider_id', provider.id)
        .eq('user_id', userId);
      return;
    }

    await supabase.from('provider_favorites').upsert({
      provider_id: provider.id,
      user_id: userId,
      is_favorite: true,
      updated_at: provider.updatedAt,
    });
  }

  async pullFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('providers').select('*');
    if (error || !data?.length) {
      await this.seedIfEmpty();
    } else {
      const db = getDatabase();
      for (const row of data) {
        const timestamp = nowIso();
        await db
          .insert(providers)
          .values({
            id: row.id,
            name: row.name,
            type: row.type,
            address: row.address,
            phone: row.phone,
            email: row.email,
            latitude: row.latitude,
            longitude: row.longitude,
            isFavorite: false,
            distanceKm: row.distance_km,
            attributes: stringifyJson(row.attributes ?? {}),
            syncStatus: 'synced',
            deletedAt: null,
            createdAt: row.created_at ?? timestamp,
            updatedAt: row.updated_at ?? timestamp,
          })
          .onConflictDoUpdate({
            target: providers.id,
            set: {
              name: row.name,
              type: row.type,
              address: row.address,
              phone: row.phone,
              email: row.email,
              latitude: row.latitude,
              longitude: row.longitude,
              distanceKm: row.distance_km,
              attributes: stringifyJson(row.attributes ?? {}),
              syncStatus: 'synced',
              updatedAt: row.updated_at ?? timestamp,
            },
          });
      }
    }

    await this.pullFavoritesFromRemote();
  }

  private async pullFavoritesFromRemote(): Promise<void> {
    const auth = useAuthStore.getState();
    const userId = auth.user?.id;
    if (!userId || auth.isGuest) {
      return;
    }

    const { data, error } = await supabase
      .from('provider_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('is_favorite', true);

    if (error || !data) {
      return;
    }

    const db = getDatabase();
    const favoriteIds = new Set(data.map((row) => String(row.provider_id)));
    const local = await db.select().from(providers).where(isNull(providers.deletedAt));

    for (const row of local) {
      const shouldFavorite = favoriteIds.has(row.id);
      if (row.isFavorite === shouldFavorite) {
        continue;
      }
      await db
        .update(providers)
        .set({
          isFavorite: shouldFavorite,
          updatedAt: nowIso(),
          syncStatus: 'synced',
        })
        .where(eq(providers.id, row.id));
    }
  }
}

export const providerRepository = new ProviderRepository();
