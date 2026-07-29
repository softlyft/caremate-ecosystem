import { createClient } from '@/lib/supabase/server';
import { auditOperationKind } from '@/lib/audit-catalog';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { AdminAuditEvent, Json } from '@/types/database';

export type { PaginatedResult };

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
} & ListPaging;

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

function operationOrFilter(operation: 'create' | 'update' | 'delete'): string {
  if (operation === 'create') {
    return [
      'action.like.create_%',
      'action.like.admin_activate%',
      'action.like.ingest_%',
      'action.like.upload_%',
      'action.like.approve_%',
      'action.like.award_%',
      'action.like.add_%',
    ].join(',');
  }
  if (operation === 'update') {
    return [
      'action.like.update_%',
      'action.like.set_%',
      'action.like.verify_%',
      'action.like.unban_%',
      'action.like.admin_upgrade%',
      'action.like.assign_%',
      'action.eq.password_reset',
    ].join(',');
  }
  return [
    'action.like.delete_%',
    'action.like.archive_%',
    'action.like.ban_%',
    'action.like.reject_%',
  ].join(',');
}

function applyAuditFilters<
  Q extends {
    eq: (column: string, value: string) => Q;
    ilike: (column: string, pattern: string) => Q;
    or: (filters: string) => Q;
  },
>(query: Q, input: Pick<ListAuditEventsInput, 'action' | 'entityType' | 'actorEmail' | 'operation'>): Q {
  let q = query;
  if (input.action?.trim()) {
    q = q.eq('action', input.action.trim());
  }
  if (input.entityType?.trim()) {
    q = q.eq('entity_type', input.entityType.trim());
  }
  if (input.actorEmail?.trim()) {
    q = q.ilike('actor_email', `%${input.actorEmail.trim()}%`);
  }
  if (
    input.operation === 'create' ||
    input.operation === 'update' ||
    input.operation === 'delete'
  ) {
    q = q.or(operationOrFilter(input.operation));
  }
  return q;
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

  query = applyAuditFilters(query, input);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(mapRow);
  if (!input.operation || input.operation !== 'other') {
    return rows;
  }
  return rows.filter((row) => auditOperationKind(row.action) === input.operation);
}

export async function listAuditEventsPage(
  input: ListAuditEventsInput = {},
): Promise<PaginatedResult<AuditLogRow>> {
  const supabase = await createClient();
  const page = parsePage(input.page);
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  if (input.operation === 'other') {
    let query = supabase
      .from('admin_audit_events')
      .select('*')
      .order('created_at', { ascending: false });

    query = applyAuditFilters(query, {
      action: input.action,
      entityType: input.entityType,
      actorEmail: input.actorEmail,
    });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const filtered = (data ?? [])
      .map(mapRow)
      .filter((row) => auditOperationKind(row.action) === 'other');
    const slice = filtered.slice(from, to + 1);
    return paginatedResult(slice, filtered.length, page, pageSize);
  }

  let query = supabase
    .from('admin_audit_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  query = applyAuditFilters(query, input);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return paginatedResult((data ?? []).map(mapRow), count, page, pageSize);
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
