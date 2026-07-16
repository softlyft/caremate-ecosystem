import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { providers } from '@/database/schema';
import { getLegacyProviderIds, getProviderSeeds } from '@/domains/providers/utils/fhir-providers';
import { useAuthStore } from '@/features/auth/store';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { toJson } from '@/sync/cloud-types';
import { isOnline } from '@/sync/network';
import type { Provider, ProviderType } from '@/types';
import { nowIso, parseJson, stringifyJson } from '@/utils/helpers';

const NEARBY_DEFAULT_RADIUS_KM = 25;
const NEARBY_DEFAULT_LIMIT = 100;

type RemoteProviderRow = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  attributes: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

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

function filterLocalRows(
  rows: (typeof providers.$inferSelect)[],
  filters?: {
    type?: ProviderType;
    favoritesOnly?: boolean;
    search?: string;
  },
): (typeof providers.$inferSelect)[] {
  let next = rows;
  if (filters?.type) {
    next = next.filter((row) => row.type === filters.type);
  }
  if (filters?.favoritesOnly) {
    next = next.filter((row) => row.isFavorite);
  }
  const term = filters?.search?.trim().toLowerCase();
  if (term) {
    next = next.filter((row) => {
      const haystacks = [row.name, row.address, row.phone, row.email, row.type];
      return haystacks.some((value) => value?.toLowerCase().includes(term));
    });
  }
  return next;
}

class ProviderRepository extends BaseRepository {
  /** Remove bundled FHIR seeds and legacy demo rows from local SQLite. */
  async purgeBundledProviders(): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const bundledIds = [
      ...getLegacyProviderIds(),
      ...getProviderSeeds().map((provider) => provider.id),
    ];
    if (bundledIds.length === 0) {
      return;
    }
    await db
      .update(providers)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(inArray(providers.id, [...bundledIds]));
  }

  /** Local-only reads (last nearby cache, favorites). Prefer findNearby when online. */
  async findAll(filters?: {
    type?: ProviderType;
    favoritesOnly?: boolean;
    search?: string;
  }): Promise<Provider[]> {
    const db = getDatabase();
    const rows = await db.select().from(providers).where(isNull(providers.deletedAt));
    return filterLocalRows(rows, filters)
      .map(mapProvider)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  /**
   * Online geo query via `nearby_providers` RPC; caches the page in SQLite.
   * Falls back to local cache when offline or the RPC fails.
   */
  async findNearby(options: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    type?: ProviderType;
    search?: string;
    limit?: number;
  }): Promise<{ providers: Provider[]; source: 'remote' | 'cache' }> {
    const online = await isOnline();
    if (online) {
      try {
        const { data, error } = await supabase.rpc('nearby_providers', {
          p_lat: options.latitude,
          p_lng: options.longitude,
          p_radius_km: options.radiusKm ?? NEARBY_DEFAULT_RADIUS_KM,
          p_type: options.type ?? null,
          p_search: options.search?.trim() || null,
          p_limit: options.limit ?? NEARBY_DEFAULT_LIMIT,
        });

        if (!error && Array.isArray(data)) {
          await this.cacheRemoteProviders(data as RemoteProviderRow[]);
          const favoriteIds = await this.localFavoriteIds();
          const mapped = (data as RemoteProviderRow[]).map((row) =>
            this.mapRemoteRow(row, favoriteIds.has(row.id)),
          );
          return { providers: mapped, source: 'remote' };
        }
      } catch {
        // Fall through to local cache.
      }
    }

    const cached = await this.findAll({
      type: options.type,
      search: options.search,
    });
    return { providers: cached, source: 'cache' };
  }

  async findById(id: string): Promise<Provider | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(providers)
      .where(and(eq(providers.id, id), isNull(providers.deletedAt)))
      .limit(1);
    if (row) {
      return mapProvider(row);
    }

    if (!(await isOnline())) {
      return null;
    }

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    await this.cacheRemoteProviders([data as RemoteProviderRow]);
    const favoriteIds = await this.localFavoriteIds();
    return this.mapRemoteRow(data as RemoteProviderRow, favoriteIds.has(id));
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

  /** Sync favorites only — do not mirror the full national catalog into SQLite. */
  async pullFromRemote(): Promise<void> {
    await this.purgeBundledProviders();
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
      .select('provider_id')
      .eq('user_id', userId)
      .eq('is_favorite', true);

    if (error || !data) {
      return;
    }

    const favoriteIds = data.map((row) => String(row.provider_id));
    if (favoriteIds.length > 0) {
      const { data: remoteProviders } = await supabase
        .from('providers')
        .select('*')
        .in('id', favoriteIds)
        .is('deleted_at', null);

      if (remoteProviders?.length) {
        await this.cacheRemoteProviders(remoteProviders as RemoteProviderRow[]);
      }
    }

    const favoriteSet = new Set(favoriteIds);
    const db = getDatabase();
    const local = await db.select().from(providers).where(isNull(providers.deletedAt));

    for (const row of local) {
      const shouldFavorite = favoriteSet.has(row.id);
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

  private async localFavoriteIds(): Promise<Set<string>> {
    const db = getDatabase();
    const rows = await db
      .select({ id: providers.id })
      .from(providers)
      .where(and(isNull(providers.deletedAt), eq(providers.isFavorite, true)));
    return new Set(rows.map((row) => row.id));
  }

  private mapRemoteRow(row: RemoteProviderRow, isFavorite: boolean): Provider {
    const timestamp = nowIso();
    let attributes: Record<string, unknown> = {};
    if (row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)) {
      attributes = row.attributes as Record<string, unknown>;
    } else if (typeof row.attributes === 'string') {
      attributes = parseJson(row.attributes, {});
    }
    return {
      id: row.id,
      name: row.name,
      type: row.type as ProviderType,
      address: row.address,
      phone: row.phone,
      email: row.email,
      latitude: row.latitude,
      longitude: row.longitude,
      isFavorite,
      distanceKm: row.distance_km,
      attributes,
      syncStatus: 'synced',
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
      createdAt: row.created_at ?? timestamp,
      updatedAt: row.updated_at ?? timestamp,
    };
  }

  private async cacheRemoteProviders(rows: RemoteProviderRow[]): Promise<void> {
    if (!rows.length) {
      return;
    }
    const db = getDatabase();
    const favoriteIds = await this.localFavoriteIds();
    const timestamp = nowIso();

    for (const row of rows) {
      const deletedAt = row.deleted_at ? String(row.deleted_at) : null;
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
          isFavorite: favoriteIds.has(row.id),
          distanceKm: row.distance_km,
          attributes: stringifyJson(row.attributes ?? {}),
          syncStatus: 'synced',
          deletedAt,
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
            deletedAt,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const providerRepository = new ProviderRepository();
