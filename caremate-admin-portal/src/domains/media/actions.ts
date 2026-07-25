'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { sniffAllowedMediaMime } from '@/lib/media-sniff';

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

export async function uploadLearnMedia(formData: FormData): Promise<string> {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('File must be between 1 byte and 15 MB');
  }

  const mime = await sniffAllowedMediaMime(file, ALLOWED_MIME);
  if (!mime) {
    throw new Error('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or WebM.');
  }

  const supabase = await createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

  const { error } = await supabase.storage.from('learn-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('learn-media').getPublicUrl(path);

  await writeAuditEvent({
    action: 'upload_media',
    entityType: 'storage',
    entityId: path,
    payload: { publicUrl, mime },
  });

  return publicUrl;
}
