import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { EmergencyShareAccessLog, Json } from '@/types/database';

export type { PaginatedResult };

export type EmergencyAccessLogRow = EmergencyShareAccessLog;

export type ListEmergencyAccessLogsInput = {
  viewerEmail?: string;
  patientQuery?: string;
  pageSize?: number;
} & ListPaging;

function asStringList(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function formatAccessBasis(basis: string): string {
  if (basis === 'health_practitioner') return 'Health practitioner';
  if (basis === 'provider_org_member') return 'Provider staff';
  if (basis === 'staff') return 'SoftLyft staff';
  return basis;
}

export function summarizeEmergencySnapshot(row: EmergencyAccessLogRow): string {
  if (!row.has_emergency_profile) {
    return 'No emergency profile on file';
  }
  const parts: string[] = [];
  if (row.blood_group) parts.push(`Blood ${row.blood_group}`);
  if (row.genotype) parts.push(`Genotype ${row.genotype}`);
  const allergies = asStringList(row.allergies);
  if (allergies.length) parts.push(`Allergies: ${allergies.join(', ')}`);
  const meds = asStringList(row.current_medications);
  if (meds.length) parts.push(`Meds: ${meds.join(', ')}`);
  const conditions = asStringList(row.chronic_conditions);
  if (conditions.length) parts.push(`Conditions: ${conditions.join(', ')}`);
  const contacts = Array.isArray(row.emergency_contacts) ? row.emergency_contacts : [];
  if (contacts.length > 0 && contacts[0] && typeof contacts[0] === 'object') {
    const c = contacts[0] as Record<string, unknown>;
    const name = typeof c.name === 'string' ? c.name : '';
    const phone = typeof c.phone === 'string' ? c.phone : '';
    if (name || phone) parts.push(`ICE: ${[name, phone].filter(Boolean).join(' · ')}`);
  }
  return parts.length ? parts.join(' · ') : 'Profile viewed (no listed fields)';
}

export async function listEmergencyAccessLogsPage(
  input: ListEmergencyAccessLogsInput = {},
): Promise<PaginatedResult<EmergencyAccessLogRow>> {
  const supabase = await createClient();
  const page = parsePage(input.page);
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('emergency_share_access_logs')
    .select('*', { count: 'exact' })
    .order('viewed_at', { ascending: false })
    .range(from, to);

  const viewerEmail = input.viewerEmail?.trim();
  if (viewerEmail) {
    query = query.ilike('viewer_email', `%${viewerEmail}%`);
  }

  const patientQuery = input.patientQuery?.trim();
  if (patientQuery) {
    query = query.or(
      `patient_full_name.ilike.%${patientQuery}%,patient_email.ilike.%${patientQuery}%,patient_caremate_id.ilike.%${patientQuery}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return paginatedResult((data ?? []) as EmergencyAccessLogRow[], count, page, pageSize);
}
