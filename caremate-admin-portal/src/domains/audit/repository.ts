import { createClient } from '@/lib/supabase/server';
import { auditOperationKind } from '@/lib/audit-catalog';
import type { AdminAuditEvent, Json } from '@/types/database';

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Json;
  created_at: string;
};

export type ListAuditEventsInput = {
  action?: string;
  entityType?: string;
  actorEmail?: string;
  operation?: 'create' | 'update' | 'delete' | 'other';
  limit?: number;
};

function mapRow(row: AdminAuditEvent): AuditLogRow {
  return {
    id: row.id,
    actor_user_id: row.actor_user_id,
    actor_email: row.actor_email,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    payload: row.payload,
    created_at: row.created_at,
  };
}

export async function listAuditEvents(
  input: ListAuditEventsInput = {},
): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

  let query = supabase
    .from('admin_audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (input.action?.trim()) {
    query = query.eq('action', input.action.trim());
  }
  if (input.entityType?.trim()) {
    query = query.eq('entity_type', input.entityType.trim());
  }
  if (input.actorEmail?.trim()) {
    query = query.ilike('actor_email', `%${input.actorEmail.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(mapRow);
  if (!input.operation) {
    return rows;
  }
  return rows.filter((row) => auditOperationKind(row.action) === input.operation);
}

export async function listDistinctAuditActions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_audit_events')
    .select('action')
    .order('action')
    .limit(500);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.action))].sort();
}

export async function listDistinctAuditEntityTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_audit_events')
    .select('entity_type')
    .order('entity_type')
    .limit(500);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.entity_type))].sort();
}
