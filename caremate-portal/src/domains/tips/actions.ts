'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

export type TipInput = {
  id?: string;
  category_id: string;
  body: string;
  sort_order?: number;
  is_active?: boolean;
};

export async function saveTip(input: TipInput) {
  await requireEditor();
  const supabase = await createClient();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    category_id: input.category_id,
    body: input.body,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    deleted_at: null,
    updated_at: now,
    ...(input.id ? {} : { created_at: now }),
  };

  const { error } = await supabase.from('health_tips').upsert(row);
  if (error) throw error;

  await writeAuditEvent({
    action: input.id ? 'update_tip' : 'create_tip',
    entityType: 'health_tip',
    entityId: id,
    payload: {
      category_id: input.category_id,
      is_active: input.is_active ?? true,
      body_preview: input.body.slice(0, 120),
    },
  });

  revalidatePath('/dashboard/tips');
  return id;
}

export async function deleteTip(id: string) {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('health_tips')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id);
  if (error) throw error;
  await writeAuditEvent({
    action: 'delete_tip',
    entityType: 'health_tip',
    entityId: id,
    payload: { operation: 'delete' },
  });
  revalidatePath('/dashboard/tips');
}
