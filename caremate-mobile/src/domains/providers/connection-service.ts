import { supabase } from '@/lib/supabase';
import type { Provider } from '@/types';

export type ConnectionStatus = 'pending' | 'approved' | 'rejected';
export type ConnectionInitiatedBy = 'patient' | 'provider';

export type PatientProviderConnection = {
  id: string;
  patientId: string;
  organizationId: string;
  status: ConnectionStatus;
  initiatedBy: ConnectionInitiatedBy;
  patientNote: string | null;
  providerNote: string | null;
  rejectionReason: string | null;
  organizationName: string | null;
  /** True when the current user is an active org member (staff/owner/admin/viewer). */
  isOrgStaff: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RemoteConnectionRow = {
  id: string;
  patient_id: string;
  organization_id: string;
  status: ConnectionStatus;
  initiated_by: ConnectionInitiatedBy;
  patient_note: string | null;
  provider_note: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(
  row: RemoteConnectionRow,
  organizationName: string | null = null,
  isOrgStaff = false,
): PatientProviderConnection {
  return {
    id: row.id,
    patientId: row.patient_id,
    organizationId: row.organization_id,
    status: row.status,
    initiatedBy: row.initiated_by,
    patientNote: row.patient_note,
    providerNote: row.provider_note,
    rejectionReason: row.rejection_reason,
    organizationName,
    isOrgStaff,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Resolve catalog org id from a Nearby provider pin (RPC / attributes). */
export function getProviderOrganizationId(provider: Provider): string | null {
  const raw = provider.attributes.organization_id ?? provider.attributes.organizationId;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  return null;
}

async function loadOrganizationNames(organizationIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(organizationIds.filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('provider_organizations')
    .select('id, name')
    .in('id', unique);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id as string, (row.name as string) ?? 'Provider']));
}

/** Org IDs where the signed-in user is an active provider_org_members row. */
async function loadMyStaffOrganizationIds(organizationIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(organizationIds.filter(Boolean))];
  if (unique.length === 0) {
    return new Set();
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('provider_org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .in('organization_id', unique)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.organization_id as string));
}

async function mapRows(rows: RemoteConnectionRow[]): Promise<PatientProviderConnection[]> {
  const orgIds = rows.map((r) => r.organization_id);
  const [names, staffOrgIds] = await Promise.all([
    loadOrganizationNames(orgIds),
    loadMyStaffOrganizationIds(orgIds),
  ]);
  return rows.map((row) =>
    mapRow(row, names.get(row.organization_id) ?? null, staffOrgIds.has(row.organization_id)),
  );
}

class ProviderConnectionService {
  async isOrganizationVerified(organizationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_provider_org_verified', {
      p_org_id: organizationId,
    });
    if (error) {
      throw error;
    }
    return Boolean(data);
  }

  async getConnectionForOrganization(
    organizationId: string,
  ): Promise<PatientProviderConnection | null> {
    const { data, error } = await supabase
      .from('patient_provider_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const names = await loadOrganizationNames([organizationId]);
    const staffOrgIds = await loadMyStaffOrganizationIds([organizationId]);
    return mapRow(
      data as RemoteConnectionRow,
      names.get(organizationId) ?? null,
      staffOrgIds.has(organizationId),
    );
  }

  async listMine(): Promise<PatientProviderConnection[]> {
    const { data, error } = await supabase
      .from('patient_provider_connections')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return mapRows((data ?? []) as RemoteConnectionRow[]);
  }

  async listApproved(): Promise<PatientProviderConnection[]> {
    const { data, error } = await supabase
      .from('patient_provider_connections')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    if (error) {
      throw error;
    }

    return mapRows((data ?? []) as RemoteConnectionRow[]);
  }

  async listInboundPending(): Promise<PatientProviderConnection[]> {
    const { data, error } = await supabase
      .from('patient_provider_connections')
      .select('*')
      .eq('status', 'pending')
      .eq('initiated_by', 'provider')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return mapRows((data ?? []) as RemoteConnectionRow[]);
  }

  async countInboundPending(): Promise<number> {
    const { count, error } = await supabase
      .from('patient_provider_connections')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('initiated_by', 'provider');

    if (error) {
      throw error;
    }
    return count ?? 0;
  }

  async requestConnection(params: {
    organizationId: string;
    patientNote?: string | null;
  }): Promise<PatientProviderConnection> {
    const { data, error } = await supabase.rpc('request_patient_provider_connection', {
      p_organization_id: params.organizationId,
      p_patient_note: params.patientNote ?? undefined,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RemoteConnectionRow;
    const names = await loadOrganizationNames([params.organizationId]);
    const staffOrgIds = await loadMyStaffOrganizationIds([params.organizationId]);
    return mapRow(
      row,
      names.get(params.organizationId) ?? null,
      staffOrgIds.has(params.organizationId),
    );
  }

  async respondToRequest(params: {
    connectionId: string;
    accept: boolean;
    rejectionReason?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();

    if (!params.accept) {
      const reason = params.rejectionReason?.trim() ?? '';
      if (!reason) {
        throw new Error('A rejection reason is required');
      }
    }

    const { data: existing, error: loadError } = await supabase
      .from('patient_provider_connections')
      .select('*')
      .eq('id', params.connectionId)
      .eq('status', 'pending')
      .eq('initiated_by', 'provider')
      .maybeSingle();

    if (loadError) {
      throw loadError;
    }
    if (!existing) {
      throw new Error('Connection request not found');
    }

    const { data, error } = await supabase
      .from('patient_provider_connections')
      .update(
        params.accept
          ? {
              status: 'approved',
              approved_at: now,
              rejected_at: null,
              rejection_reason: null,
            }
          : {
              status: 'rejected',
              approved_at: null,
              rejected_at: now,
              rejection_reason: params.rejectionReason!.trim(),
            },
      )
      .eq('id', params.connectionId)
      .eq('status', 'pending')
      .eq('initiated_by', 'provider')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const row = data as RemoteConnectionRow;
    const reason = params.rejectionReason?.trim();
    const { error: activityError } = await supabase.from('patient_provider_activities').insert({
      organization_id: row.organization_id,
      patient_id: row.patient_id,
      connection_id: row.id,
      event_type: params.accept ? 'connection_approved' : 'connection_rejected',
      summary: params.accept ? 'Patient approved connection' : 'Patient rejected connection',
      metadata: {
        initiated_by: 'provider',
        responded_by: 'patient',
        ...(reason ? { rejection_reason: reason } : {}),
      },
    });

    if (activityError) {
      throw activityError;
    }
  }
}

export const providerConnectionService = new ProviderConnectionService();
