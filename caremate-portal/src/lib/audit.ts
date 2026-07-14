'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalSession } from '@/lib/auth';
import type { Json } from '@/types/database';

export async function writeAuditEvent(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Json;
}) {
  const session = await requirePortalSession();
  const admin = createAdminClient();

  await admin.from('admin_audit_events').insert({
    id: crypto.randomUUID(),
    actor_user_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {},
  });
}
