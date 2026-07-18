'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalSession } from '@/lib/auth';
import type { Json } from '@/types/database';
import type { AuditAction, AuditEntityType } from '@/lib/audit-catalog';

/**
 * Persist a portal mutation audit row.
 * Fail-closed: throws if the insert fails so mutations do not succeed silently without a trail.
 */
export async function writeAuditEvent(input: {
  action: AuditAction;
  entityType: AuditEntityType | string;
  entityId?: string | null;
  payload?: Json;
}) {
  const session = await requirePortalSession();
  const admin = createAdminClient();

  const { error } = await admin.from('admin_audit_events').insert({
    id: crypto.randomUUID(),
    actor_user_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {},
  });

  if (error) {
    throw new Error(`Failed to write audit event: ${error.message}`);
  }
}
