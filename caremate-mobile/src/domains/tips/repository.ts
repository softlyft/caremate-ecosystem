import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { healthCategoryIdsForQuery } from '@/domains/articles/categories';
import { config } from '@/constants/env';
import { getDatabase } from '@/database/client';
import { healthTips } from '@/database/schema';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { isOnline } from '@/sync/network';
import { nowIso } from '@/utils/helpers';

export type LocalHealthTip = {
  id: string;
  categoryId: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
};

class HealthTipRepository extends BaseRepository {
  async findActive(): Promise<LocalHealthTip[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(healthTips)
      .where(and(isNull(healthTips.deletedAt), eq(healthTips.isActive, true)))
      .orderBy(asc(healthTips.categoryId), asc(healthTips.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      body: row.body,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    }));
  }

  async findActiveByCategory(categoryId: string): Promise<LocalHealthTip[]> {
    const db = getDatabase();
    const categoryIds = healthCategoryIdsForQuery(categoryId);
    const categoryClause =
      categoryIds.length === 1
        ? eq(healthTips.categoryId, categoryIds[0]!)
        : inArray(healthTips.categoryId, categoryIds);
    const rows = await db
      .select()
      .from(healthTips)
      .where(and(categoryClause, isNull(healthTips.deletedAt), eq(healthTips.isActive, true)))
      .orderBy(asc(healthTips.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      body: row.body,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    }));
  }

  async pullFromRemote(): Promise<void> {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const online = await isOnline();
    if (!online) {
      return;
    }

    const { data, error } = await supabase.from('health_tips').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();

    for (const row of data) {
      if (row.deleted_at) {
        await db
          .insert(healthTips)
          .values({
            id: row.id,
            categoryId: row.category_id,
            body: row.body,
            sortOrder: row.sort_order ?? 0,
            isActive: row.is_active ?? false,
            syncStatus: 'synced',
            deletedAt: row.deleted_at,
            createdAt: row.created_at ?? timestamp,
            updatedAt: row.updated_at ?? timestamp,
          })
          .onConflictDoUpdate({
            target: healthTips.id,
            set: {
              deletedAt: row.deleted_at,
              isActive: row.is_active ?? false,
              syncStatus: 'synced',
              updatedAt: row.updated_at ?? timestamp,
            },
          });
        continue;
      }

      await db
        .insert(healthTips)
        .values({
          id: row.id,
          categoryId: row.category_id,
          body: row.body,
          sortOrder: row.sort_order ?? 0,
          isActive: row.is_active ?? true,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: healthTips.id,
          set: {
            categoryId: row.category_id,
            body: row.body,
            sortOrder: row.sort_order ?? 0,
            isActive: row.is_active ?? true,
            syncStatus: 'synced',
            deletedAt: null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const healthTipRepository = new HealthTipRepository();
