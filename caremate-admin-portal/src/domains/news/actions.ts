'use server';

import { revalidatePath } from 'next/cache';

import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { requirePortalSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import {
  fetchHealthNews,
  isCurrentsConfigured,
  mergeNewsRegions,
  toExternalArticleId,
  type CurrentsNewsItem,
} from '@/domains/news/currents';
import type { ExternalNewsRegion } from '@/domains/news/regions';

const HEALTH_CATEGORY_ID = 'health';
const HEALTH_CATEGORY_NAME = 'Health News';
const SYNC_LIMIT = 15;

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

export type SyncExternalNewsResult = {
  region: ExternalNewsRegion;
  fetched: number;
  inserted: number;
  updated: number;
};

function asAttributes(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function upsertCurrentsItem(
  item: CurrentsNewsItem,
  region: ExternalNewsRegion,
  now: string,
): Promise<'inserted' | 'updated'> {
  const supabase = await createClient();
  const id = toExternalArticleId(item.id);
  const summary = item.description?.trim() || null;
  const content = item.description?.trim() || item.title;
  const imageUrl = item.image || null;
  const sourcePublishedAt = item.published || now;

  const { data: existing, error: existingError } = await supabase
    .from('articles')
    .select('id, attributes, first_seen_at, published_at, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (existingError) throw existingError;

  const existingAttributes = asAttributes(existing?.attributes);
  const attributes = {
    ...mergeNewsRegions(existingAttributes, region),
    sourcePublishedAt,
    sourceAuthor: item.author || null,
    sourceLanguage: item.language || null,
  } as Json;

  if (!existing) {
    const { error } = await supabase.from('articles').insert({
      id,
      title: item.title,
      summary,
      content,
      content_type: 'article',
      category_id: HEALTH_CATEGORY_ID,
      category_name: HEALTH_CATEGORY_NAME,
      image_url: imageUrl,
      source_url: item.url || null,
      published_at: now,
      first_seen_at: now,
      attributes,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return 'inserted';
  }

  // Re-sync: keep first_seen_at forever. Do not revive deleted rows automatically.
  // Do not force-republish if staff unpublished (published_at null) unless deleted.
  const { error } = await supabase
    .from('articles')
    .update({
      title: item.title,
      summary,
      content,
      content_type: 'article',
      category_id: HEALTH_CATEGORY_ID,
      category_name: HEALTH_CATEGORY_NAME,
      image_url: imageUrl,
      source_url: item.url || null,
      attributes,
      // Preserve first_seen_at — omit from update.
      // Preserve published_at / deleted_at editorial state.
      updated_at: now,
    })
    .eq('id', id);
  if (error) throw error;
  return 'updated';
}

export async function syncExternalNews(region: ExternalNewsRegion): Promise<SyncExternalNewsResult> {
  await requireEditor();

  if (!isCurrentsConfigured()) {
    throw new Error('CURRENTS_API_KEY is not configured');
  }

  if (region !== 'INT' && region !== 'NG') {
    throw new Error('Unsupported news region');
  }

  const now = new Date().toISOString();
  const items = await fetchHealthNews(region, SYNC_LIMIT, 'en');

  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    const outcome = await upsertCurrentsItem(item, region, now);
    if (outcome === 'inserted') inserted += 1;
    else updated += 1;
  }

  await writeAuditEvent({
    action: 'sync_external_news',
    entityType: 'article',
    entityId: `news:${region}`,
    payload: {
      region,
      fetched: items.length,
      inserted,
      updated,
      limit: SYNC_LIMIT,
    },
  });

  revalidatePath('/dashboard/news');
  return { region, fetched: items.length, inserted, updated };
}

export async function setExternalNewsPublished(id: string, published: boolean): Promise<void> {
  await requireEditor();
  if (!id.startsWith('currents-')) {
    throw new Error('Only external news articles can be toggled here');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('articles')
    .update({
      published_at: published ? now : null,
      updated_at: now,
    })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw error;

  await writeAuditEvent({
    action: published ? 'publish_external_news' : 'unpublish_external_news',
    entityType: 'article',
    entityId: id,
    payload: { published },
  });

  revalidatePath('/dashboard/news');
}

export async function deleteExternalNews(id: string): Promise<void> {
  await requireEditor();
  if (!id.startsWith('currents-')) {
    throw new Error('Only external news articles can be deleted here');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Tombstone RLS requires published_at IS NOT NULL so devices receive the delete.
  const { data: existing, error: existingError } = await supabase
    .from('articles')
    .select('published_at')
    .eq('id', id)
    .maybeSingle();
  if (existingError) throw existingError;

  const { error } = await supabase
    .from('articles')
    .update({
      deleted_at: now,
      updated_at: now,
      published_at: existing?.published_at ?? now,
    })
    .eq('id', id);
  if (error) throw error;

  await writeAuditEvent({
    action: 'delete_external_news',
    entityType: 'article',
    entityId: id,
    payload: { operation: 'delete' },
  });

  revalidatePath('/dashboard/news');
}
