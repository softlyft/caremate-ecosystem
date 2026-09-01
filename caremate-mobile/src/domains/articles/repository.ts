import { and, desc, eq, inArray, isNull, like, or } from 'drizzle-orm';

import { localizationService } from '@/domains/localization';
import { config } from '@/constants/env';
import { getDatabase } from '@/database/client';
import { articles, articleReads, bookmarks } from '@/database/schema';
import { healthCategoryIdsForQuery } from '@/domains/articles/categories';
import {
  articleMatchesNewsRegion,
  getLegacySeedIds,
  HOME_TRENDING_COUNTRY_SLOTS,
  HOME_TRENDING_INT_SLOTS,
  HOME_TRENDING_MAX_ITEMS,
  isEvergreenArticle,
  isExternalArticle,
  isWithinExternalNewsRetention,
  LEARN_CATEGORIES,
  orderLearnFeed,
  orderTrendingFeed,
  shouldEvictExternalNewsFromDevice,
} from '@/domains/articles/utils/evergreen-articles';
import { INTERNATIONAL_COUNTRY_CODE } from '@/domains/localization/config';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { isOnline } from '@/sync/network';
import type { Article, ArticleCategory, ArticleRead, ArticleReadStatus, Bookmark } from '@/types';
import { createId, nowIso, parseJson, stringifyJson } from '@/utils/helpers';
import { isLearnContentType } from '@/domains/articles/content-types';

const HEALTH_CATEGORY_ID = 'health';

function byNewestNews(a: Article, b: Article): number {
  const aKey = a.publishedAt ?? a.updatedAt ?? '';
  const bKey = b.publishedAt ?? b.updatedAt ?? '';
  return bKey.localeCompare(aKey);
}

function mapArticle(row: typeof articles.$inferSelect): Article {
  const rawType = row.contentType ?? 'article';
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    contentType: isLearnContentType(rawType) ? rawType : 'article',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl ?? null,
    publishedAt: row.publishedAt,
    attributes: parseJson<Record<string, unknown>>(row.attributes, {}),
    syncStatus: row.syncStatus as Article['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function withFirstSeenAttribute(
  attributes: Record<string, unknown>,
  firstSeenAt: string | null | undefined,
): Record<string, unknown> {
  if (!firstSeenAt) {
    return attributes;
  }
  return { ...attributes, firstSeenAt };
}

class ArticleRepository extends BaseRepository {
  /** Soft-delete legacy bundled ids left over from older installs. */
  async purgeLegacySeeds(): Promise<void> {
    const legacyIds = getLegacySeedIds();
    if (legacyIds.length === 0) {
      return;
    }
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(articles)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(inArray(articles.id, [...legacyIds]));
  }

  async findAll(search?: string, userKey = 'guest'): Promise<Article[]> {
    const db = getDatabase();
    const term = search?.trim();
    const rows = term
      ? await db
          .select()
          .from(articles)
          .where(
            and(
              isNull(articles.deletedAt),
              or(
                like(articles.title, `%${term}%`),
                like(articles.summary, `%${term}%`),
                like(articles.content, `%${term}%`),
              ),
            ),
          )
      : await db.select().from(articles).where(isNull(articles.deletedAt));

    const mapped = rows
      .map(mapArticle)
      .filter((article) => !isExternalArticle(article) || isWithinExternalNewsRetention(article));
    return orderLearnFeed(mapped, userKey);
  }

  /** External news for the user's country and international (INT), within retention. */
  async findNews(
    search?: string,
    countryCode: string | null | undefined = null,
  ): Promise<Article[]> {
    const db = getDatabase();
    const term = search?.trim();
    const rows = term
      ? await db
          .select()
          .from(articles)
          .where(
            and(
              isNull(articles.deletedAt),
              or(
                like(articles.title, `%${term}%`),
                like(articles.summary, `%${term}%`),
                like(articles.content, `%${term}%`),
              ),
            ),
          )
      : await db.select().from(articles).where(isNull(articles.deletedAt));

    const resolvedCountry = localizationService.resolveNewsCountryCode(countryCode);
    return rows
      .map(mapArticle)
      .filter((article) => {
        if (!isExternalArticle(article) || !isWithinExternalNewsRetention(article)) {
          return false;
        }
        if (articleMatchesNewsRegion(article, INTERNATIONAL_COUNTRY_CODE)) {
          return true;
        }
        return (
          resolvedCountry !== INTERNATIONAL_COUNTRY_CODE &&
          articleMatchesNewsRegion(article, resolvedCountry)
        );
      })
      .sort(byNewestNews);
  }

  async findTrending(
    limit = HOME_TRENDING_MAX_ITEMS,
    userKey = 'guest',
    countryCode: string | null | undefined = null,
  ): Promise<Article[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(articles)
      .where(isNull(articles.deletedAt))
      .orderBy(desc(articles.publishedAt));

    const mapped = rows.map(mapArticle);
    const evergreen = mapped.filter(isEvergreenArticle);
    const external = mapped.filter(
      (article) =>
        isExternalArticle(article) &&
        article.categoryId === HEALTH_CATEGORY_ID &&
        isWithinExternalNewsRetention(article),
    );

    const resolvedCountry = localizationService.resolveNewsCountryCode(countryCode);
    const ordered = orderTrendingFeed(evergreen, external, {
      userKey,
      countryCode: resolvedCountry,
      intSlots: HOME_TRENDING_INT_SLOTS,
      countrySlots: HOME_TRENDING_COUNTRY_SLOTS,
    });

    if (ordered.length > 0) {
      return ordered.slice(0, limit);
    }

    return mapped.filter(isEvergreenArticle).slice(0, Math.min(limit, 1));
  }

  async getTrendingToday(
    limit = HOME_TRENDING_MAX_ITEMS,
    options: { isGuest: boolean; countryCode?: string | null; userKey?: string } = {
      isGuest: true,
    },
  ): Promise<Article[]> {
    // Offline-first: local SQLite only. External news arrives via Supabase pull.
    return this.findTrending(
      limit,
      options.userKey ?? (options.isGuest ? 'guest' : 'user'),
      options.countryCode,
    );
  }

  /**
   * Hard-delete external news outside the retention window (and any soft-deleted
   * external rows). Also removes local bookmarks / read state for those articles.
   */
  async purgeStaleExternalNews(now = new Date()): Promise<void> {
    const db = getDatabase();
    const rows = await db.select().from(articles);

    for (const row of rows) {
      const article = mapArticle(row);
      if (!shouldEvictExternalNewsFromDevice(article, { deletedAt: row.deletedAt, now })) {
        continue;
      }
      await this.hardDeleteExternalArticle(article.id);
    }
  }

  /**
   * Hard-delete local external news that is no longer in the published remote set
   * (unpublished or removed server-side without a tombstone).
   */
  async reconcileExternalNews(remoteLiveIds: Set<string>): Promise<void> {
    const db = getDatabase();
    const rows = await db.select().from(articles);

    for (const row of rows) {
      const article = mapArticle(row);
      if (!isExternalArticle(article)) {
        continue;
      }
      if (remoteLiveIds.has(article.id)) {
        continue;
      }
      await this.hardDeleteExternalArticle(article.id);
    }
  }

  private async hardDeleteExternalArticle(articleId: string): Promise<void> {
    const db = getDatabase();
    await db.delete(bookmarks).where(eq(bookmarks.articleId, articleId));
    await db.delete(articleReads).where(eq(articleReads.articleId, articleId));
    await db.delete(articles).where(eq(articles.id, articleId));
  }

  async findByCategory(categoryId: string, userKey = 'guest', search?: string): Promise<Article[]> {
    const db = getDatabase();
    const term = search?.trim();
    const categoryIds = healthCategoryIdsForQuery(categoryId);
    const categoryClause =
      categoryIds.length === 1
        ? eq(articles.categoryId, categoryIds[0]!)
        : inArray(articles.categoryId, categoryIds);
    const rows = term
      ? await db
          .select()
          .from(articles)
          .where(
            and(
              categoryClause,
              isNull(articles.deletedAt),
              or(
                like(articles.title, `%${term}%`),
                like(articles.summary, `%${term}%`),
                like(articles.content, `%${term}%`),
              ),
            ),
          )
      : await db
          .select()
          .from(articles)
          .where(and(categoryClause, isNull(articles.deletedAt)));
    const mapped = rows.map(mapArticle).filter((article) => !isExternalArticle(article));
    return orderLearnFeed(mapped, userKey);
  }

  async findById(id: string): Promise<Article | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
      .limit(1);
    return row ? mapArticle(row) : null;
  }

  async getCategories(): Promise<ArticleCategory[]> {
    return LEARN_CATEGORIES;
  }

  async getBookmarks(userId: string): Promise<Article[]> {
    const db = getDatabase();
    const rows = await db
      .select({ article: articles })
      .from(bookmarks)
      .innerJoin(articles, eq(bookmarks.articleId, articles.id))
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)));

    return rows.map((row) => mapArticle(row.article));
  }

  async toggleBookmark(userId: string, articleId: string): Promise<boolean> {
    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.articleId, articleId),
          isNull(bookmarks.deletedAt),
        ),
      )
      .limit(1);

    const timestamp = nowIso();

    if (existing) {
      await db
        .update(bookmarks)
        .set({ deletedAt: timestamp, syncStatus: 'pending', updatedAt: timestamp })
        .where(eq(bookmarks.id, existing.id));

      await this.queueSync({
        entityType: 'bookmarks',
        entityId: existing.id,
        operation: 'delete',
        payload: { id: existing.id, articleId, userId },
      });

      return false;
    }

    const id = await createId();
    const bookmark: Bookmark = {
      id,
      articleId,
      userId,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(bookmarks).values({
      id: bookmark.id,
      articleId: bookmark.articleId,
      userId: bookmark.userId,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'bookmarks',
      entityId: bookmark.id,
      operation: 'create',
      payload: bookmark,
    });

    return true;
  }

  async isBookmarked(userId: string, articleId: string): Promise<boolean> {
    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.articleId, articleId),
          isNull(bookmarks.deletedAt),
        ),
      )
      .limit(1);
    return Boolean(existing);
  }

  async getReadStatus(userId: string, articleId: string): Promise<ArticleReadStatus | null> {
    const row = await this.findActiveRead(userId, articleId);
    return row ? (row.status as ArticleReadStatus) : null;
  }

  async getArticlesByReadStatus(userId: string, status: ArticleReadStatus): Promise<Article[]> {
    const db = getDatabase();
    const rows = await db
      .select({ article: articles })
      .from(articleReads)
      .innerJoin(articles, eq(articleReads.articleId, articles.id))
      .where(
        and(
          eq(articleReads.userId, userId),
          eq(articleReads.status, status),
          isNull(articleReads.deletedAt),
          isNull(articles.deletedAt),
        ),
      )
      .orderBy(desc(articleReads.updatedAt));

    return rows.map((row) => mapArticle(row.article));
  }

  /**
   * Opened an article: mark as `reading` unless already `read`
   * (reopening a finished article keeps it read).
   */
  async markReading(userId: string, articleId: string): Promise<ArticleReadStatus> {
    const existing = await this.findActiveRead(userId, articleId);
    if (existing?.status === 'read') {
      return 'read';
    }
    if (existing?.status === 'reading') {
      return 'reading';
    }

    await this.upsertReadRow(userId, articleId, {
      status: 'reading',
      openedAt: nowIso(),
      readAt: null,
    });
    return 'reading';
  }

  async markRead(userId: string, articleId: string): Promise<ArticleReadStatus> {
    const existing = await this.findActiveRead(userId, articleId);
    const timestamp = nowIso();
    if (existing) {
      await this.touchReadRow(existing.id, {
        status: 'read',
        openedAt: existing.openedAt,
        readAt: timestamp,
        updatedAt: timestamp,
      });
      return 'read';
    }

    await this.upsertReadRow(userId, articleId, {
      status: 'read',
      openedAt: timestamp,
      readAt: timestamp,
    });
    return 'read';
  }

  /** Toggle finished state: read ↔ clear. Reading (or none) → read. */
  async toggleMarkRead(userId: string, articleId: string): Promise<ArticleReadStatus | null> {
    const existing = await this.findActiveRead(userId, articleId);
    if (existing?.status === 'read') {
      await this.clearRead(userId, articleId, existing.id);
      return null;
    }
    return this.markRead(userId, articleId);
  }

  private async findActiveRead(userId: string, articleId: string) {
    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(articleReads)
      .where(
        and(
          eq(articleReads.userId, userId),
          eq(articleReads.articleId, articleId),
          isNull(articleReads.deletedAt),
        ),
      )
      .limit(1);
    return existing ?? null;
  }

  private async clearRead(userId: string, articleId: string, rowId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(articleReads)
      .set({ deletedAt: timestamp, syncStatus: 'pending', updatedAt: timestamp })
      .where(eq(articleReads.id, rowId));

    await this.queueSync({
      entityType: 'article_reads',
      entityId: rowId,
      operation: 'delete',
      payload: { id: rowId, articleId, userId },
    });
  }

  private async upsertReadRow(
    userId: string,
    articleId: string,
    fields: { status: ArticleReadStatus; openedAt: string; readAt: string | null },
  ): Promise<ArticleRead> {
    const db = getDatabase();
    const timestamp = nowIso();

    // Revive a soft-deleted row for the same article if present.
    const [softDeleted] = await db
      .select()
      .from(articleReads)
      .where(and(eq(articleReads.userId, userId), eq(articleReads.articleId, articleId)))
      .limit(1);

    if (softDeleted) {
      const row: ArticleRead = {
        id: softDeleted.id,
        articleId,
        userId,
        status: fields.status,
        openedAt: fields.openedAt,
        readAt: fields.readAt,
        syncStatus: 'pending',
        deletedAt: null,
        createdAt: softDeleted.createdAt,
        updatedAt: timestamp,
      };
      await db
        .update(articleReads)
        .set({
          status: row.status,
          openedAt: row.openedAt,
          readAt: row.readAt,
          syncStatus: 'pending',
          deletedAt: null,
          updatedAt: timestamp,
        })
        .where(eq(articleReads.id, softDeleted.id));

      await this.queueSync({
        entityType: 'article_reads',
        entityId: row.id,
        operation: 'update',
        payload: row,
      });
      return row;
    }

    const id = await createId();
    const row: ArticleRead = {
      id,
      articleId,
      userId,
      status: fields.status,
      openedAt: fields.openedAt,
      readAt: fields.readAt,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(articleReads).values({
      id: row.id,
      articleId: row.articleId,
      userId: row.userId,
      status: row.status,
      openedAt: row.openedAt,
      readAt: row.readAt,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'article_reads',
      entityId: row.id,
      operation: 'create',
      payload: row,
    });
    return row;
  }

  private async touchReadRow(
    rowId: string,
    fields: {
      status: ArticleReadStatus;
      openedAt: string;
      readAt: string | null;
      updatedAt: string;
    },
  ): Promise<void> {
    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(articleReads)
      .where(eq(articleReads.id, rowId))
      .limit(1);
    if (!existing) return;

    const row: ArticleRead = {
      id: existing.id,
      articleId: existing.articleId,
      userId: existing.userId,
      status: fields.status,
      openedAt: fields.openedAt,
      readAt: fields.readAt,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: existing.createdAt,
      updatedAt: fields.updatedAt,
    };

    await db
      .update(articleReads)
      .set({
        status: row.status,
        openedAt: row.openedAt,
        readAt: row.readAt,
        syncStatus: 'pending',
        deletedAt: null,
        updatedAt: fields.updatedAt,
      })
      .where(eq(articleReads.id, rowId));

    await this.queueSync({
      entityType: 'article_reads',
      entityId: row.id,
      operation: 'update',
      payload: row,
    });
  }

  async syncBookmarkToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('bookmarks').delete().eq('id', entityId);
      return;
    }

    const bookmark = payload as Bookmark;
    await supabase.from('bookmarks').upsert({
      id: bookmark.id,
      article_id: bookmark.articleId,
      user_id: bookmark.userId,
      updated_at: bookmark.updatedAt,
    });
  }

  async syncArticleReadToRemote(
    entityId: string,
    operation: string,
    payload: unknown,
  ): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('article_reads').delete().eq('id', entityId);
      return;
    }

    const row = payload as ArticleRead;
    await supabase.from('article_reads').upsert({
      id: row.id,
      article_id: row.articleId,
      user_id: row.userId,
      status: row.status,
      opened_at: row.openedAt,
      read_at: row.readAt,
      updated_at: row.updatedAt,
    });
  }

  async pullFromRemote(): Promise<void> {
    await this.purgeLegacySeeds();

    if (!config.isSupabaseConfigured) {
      await this.purgeStaleExternalNews();
      return;
    }

    const online = await isOnline();
    if (!online) {
      await this.purgeStaleExternalNews();
      return;
    }

    // RLS returns published live rows + published soft-deleted tombstones (any role).
    const { data, error } = await supabase.from('articles').select('*');
    if (error || !data) {
      await this.purgeStaleExternalNews();
      return;
    }

    // An empty successful payload is unusual (catalog should still have evergreen).
    // Skip reconcile so we do not wipe the local Currents cache on a bad/empty response.
    if (data.length === 0) {
      await this.purgeStaleExternalNews();
      return;
    }

    const db = getDatabase();
    const timestamp = nowIso();
    const remoteLiveIds = new Set<string>();

    for (const row of data) {
      const baseAttributes = withFirstSeenAttribute(
        (row.attributes as Record<string, unknown> | null) ?? {},
        row.first_seen_at,
      );

      if (row.deleted_at) {
        const isExternal = Boolean(row.source_url) || String(row.id).startsWith('currents-');
        if (isExternal) {
          await this.hardDeleteExternalArticle(row.id);
          continue;
        }

        await db
          .insert(articles)
          .values({
            id: row.id,
            title: row.title,
            summary: row.summary,
            content: row.content ?? '',
            contentType: row.content_type ?? 'article',
            categoryId: row.category_id,
            categoryName: row.category_name,
            imageUrl: row.image_url,
            sourceUrl: row.source_url ?? null,
            publishedAt: row.published_at,
            attributes: stringifyJson(baseAttributes),
            syncStatus: 'synced',
            deletedAt: row.deleted_at,
            createdAt: row.created_at ?? timestamp,
            updatedAt: row.updated_at ?? timestamp,
          })
          .onConflictDoUpdate({
            target: articles.id,
            set: {
              deletedAt: row.deleted_at,
              syncStatus: 'synced',
              updatedAt: row.updated_at ?? timestamp,
            },
          });
        continue;
      }

      remoteLiveIds.add(row.id);

      await db
        .insert(articles)
        .values({
          id: row.id,
          title: row.title,
          summary: row.summary,
          content: row.content,
          contentType: row.content_type ?? 'article',
          categoryId: row.category_id,
          categoryName: row.category_name,
          imageUrl: row.image_url,
          sourceUrl: row.source_url ?? null,
          publishedAt: row.published_at,
          attributes: stringifyJson(baseAttributes),
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? row.first_seen_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: articles.id,
          set: {
            title: row.title,
            summary: row.summary,
            content: row.content,
            contentType: row.content_type ?? 'article',
            categoryId: row.category_id,
            categoryName: row.category_name,
            imageUrl: row.image_url,
            sourceUrl: row.source_url ?? null,
            publishedAt: row.published_at,
            attributes: stringifyJson(baseAttributes),
            syncStatus: 'synced',
            deletedAt: null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }

    await this.reconcileExternalNews(remoteLiveIds);
    await this.purgeStaleExternalNews();
  }

  async pullBookmarksFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('bookmarks').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      const timestamp = nowIso();
      await db
        .insert(bookmarks)
        .values({
          id: row.id,
          articleId: row.article_id,
          userId: row.user_id,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: bookmarks.id,
          set: {
            articleId: row.article_id,
            userId: row.user_id,
            syncStatus: 'synced',
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }

  async pullArticleReadsFromRemote(): Promise<void> {
    const { data, error } = await supabase.from('article_reads').select('*');
    if (error || !data) {
      return;
    }

    const db = getDatabase();
    for (const row of data) {
      const timestamp = nowIso();
      await db
        .insert(articleReads)
        .values({
          id: row.id,
          articleId: row.article_id,
          userId: row.user_id,
          status: row.status,
          openedAt: row.opened_at ?? timestamp,
          readAt: row.read_at ?? null,
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: articleReads.id,
          set: {
            articleId: row.article_id,
            userId: row.user_id,
            status: row.status,
            openedAt: row.opened_at ?? timestamp,
            readAt: row.read_at ?? null,
            syncStatus: 'synced',
            deletedAt: null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const articleRepository = new ArticleRepository();
