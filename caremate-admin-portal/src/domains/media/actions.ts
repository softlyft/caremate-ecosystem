'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';

export async function uploadLearnMedia(formData: FormData): Promise<string> {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }

  const supabase = await createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from('learn-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('learn-media').getPublicUrl(path);

  await writeAuditEvent({
    action: 'upload_media',
    entityType: 'storage',
    entityId: path,
    payload: { publicUrl },
  });

  return publicUrl;
}
