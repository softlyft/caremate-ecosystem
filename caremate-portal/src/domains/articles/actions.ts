'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { categoryName } from '@/constants/categories';
import type { Json } from '@/types/database';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

export type ArticleInput = {
  id?: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  content_type: string;
  category_id?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  attributes?: Json;
};

export async function saveArticle(input: ArticleInput) {
  await requireEditor();
  const supabase = await createClient();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const categoryId = input.category_id?.trim() || 'uncategorized';
  const row = {
    id,
    title: input.title,
    summary: input.summary ?? null,
    content: input.content ?? '',
    content_type: input.content_type,
    category_id: categoryId,
    category_name: categoryName(categoryId),
    image_url: input.image_url ?? null,
    source_url: input.source_url ?? null,
    published_at: input.published_at || null,
    attributes: input.attributes ?? {},
    deleted_at: null,
    updated_at: now,
    ...(input.id ? {} : { created_at: now }),
  };

  const { error } = await supabase.from('articles').upsert(row);
  if (error) throw error;

  await writeAuditEvent({
    action: input.id ? 'update_article' : 'create_article',
    entityType: 'article',
    entityId: id,
    payload: {
      title: input.title,
      content_type: input.content_type,
      category_id: categoryId,
      operation: input.id ? 'update' : 'create',
    },
  });

  revalidatePath('/dashboard/learn');
  revalidatePath(`/dashboard/learn/${id}`);
  return id;
}

export async function deleteArticle(id: string) {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('articles')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id);
  if (error) throw error;
  await writeAuditEvent({
    action: 'delete_article',
    entityType: 'article',
    entityId: id,
    payload: { operation: 'delete' },
  });
  revalidatePath('/dashboard/learn');
}
