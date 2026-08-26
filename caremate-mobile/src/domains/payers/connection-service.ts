import { supabase } from '@/lib/supabase';

export type PayerConnectionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'disconnected';
export type PayerConnectionInitiatedBy = 'patient' | 'payer';

export type PatientPayerConnection = {
  id: string;
  patientId: string;
  payerOrganizationId: string;
  status: PayerConnectionStatus;
  initiatedBy: PayerConnectionInitiatedBy;
  patientNote: string | null;
  payerNote: string | null;
  rejectionReason: string | null;
  payerName: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RemotePayerConnectionRow = {
  id: string;
  patient_id: string;
  payer_organization_id: string;
  status: PayerConnectionStatus;
  initiated_by: PayerConnectionInitiatedBy;
  patient_note: string | null;
  payer_note: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isInactivePayerConnectionStatus(status: PayerConnectionStatus): boolean {
  return status === 'cancelled' || status === 'disconnected';
}

function mapRow(
  row: RemotePayerConnectionRow,
  payerName: string | null = null,
): PatientPayerConnection {
  return {
    id: row.id,
    patientId: row.patient_id,
    payerOrganizationId: row.payer_organization_id,
    status: row.status,
    initiatedBy: row.initiated_by,
    patientNote: row.patient_note,
    payerNote: row.payer_note,
    rejectionReason: row.rejection_reason,
    payerName,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadPayerNames(payerIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(payerIds.filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('payer_directory')
    .select('id, name')
    .in('id', unique);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id as string, (row.name as string) ?? 'Insurer']));
}

async function mapRows(rows: RemotePayerConnectionRow[]): Promise<PatientPayerConnection[]> {
  const payerIds = rows.map((row) => row.payer_organization_id);
  const names = await loadPayerNames(payerIds);
  return rows.map((row) =>
    mapRow(row, names.get(row.payer_organization_id) ?? null),
  );
}

class PayerConnectionService {
  async getConnectionForPayerOrganization(
    payerOrganizationId: string,
  ): Promise<PatientPayerConnection | null> {
    const { data, error } = await supabase
      .from('patient_payer_connections')
      .select('*')
      .eq('payer_organization_id', payerOrganizationId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const names = await loadPayerNames([payerOrganizationId]);
    const connection = mapRow(
      data as RemotePayerConnectionRow,
      names.get(payerOrganizationId) ?? null,
    );
    if (isInactivePayerConnectionStatus(connection.status)) {
      return null;
    }
    return connection;
  }

  async listApproved(): Promise<PatientPayerConnection[]> {
    const { data, error } = await supabase
      .from('patient_payer_connections')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    if (error) {
      throw error;
    }

    return mapRows((data ?? []) as RemotePayerConnectionRow[]);
  }

  async listInboundPending(): Promise<PatientPayerConnection[]> {
    const { data, error } = await supabase
      .from('patient_payer_connections')
      .select('*')
      .eq('status', 'pending')
      .eq('initiated_by', 'payer')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return mapRows((data ?? []) as RemotePayerConnectionRow[]);
  }

  async requestConnection(params: {
    payerOrganizationId: string;
    patientNote?: string | null;
  }): Promise<PatientPayerConnection> {
    const { data, error } = await supabase.rpc('request_patient_payer_connection', {
      p_payer_organization_id: params.payerOrganizationId,
      p_patient_note: params.patientNote ?? undefined,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RemotePayerConnectionRow;
    const names = await loadPayerNames([params.payerOrganizationId]);
    return mapRow(row, names.get(params.payerOrganizationId) ?? null);
  }

  async respondToRequest(params: {
    connectionId: string;
    accept: boolean;
    rejectionReason?: string | null;
    note?: string | null;
  }): Promise<void> {
    if (!params.accept) {
      const reason = params.rejectionReason?.trim() ?? '';
      if (!reason) {
        throw new Error('A rejection reason is required');
      }
    }

    const { error } = await supabase.rpc('respond_patient_payer_connection', {
      p_connection_id: params.connectionId,
      p_accept: params.accept,
      p_rejection_reason: params.rejectionReason?.trim() ?? undefined,
      p_note: params.note?.trim() ?? undefined,
    });

    if (error) {
      throw error;
    }
  }

  async cancelPendingRequest(connectionId: string, reason: string): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new Error('A cancellation reason is required');
    }

    const { error } = await supabase.rpc('cancel_pending_patient_payer_connection', {
      p_connection_id: connectionId,
      p_reason: trimmed,
    });

    if (error) {
      throw error;
    }
  }

  async disconnectConnection(connectionId: string, reason?: string | null): Promise<void> {
    const { error } = await supabase.rpc('disconnect_patient_payer_connection', {
      p_connection_id: connectionId,
      p_reason: reason?.trim() ?? undefined,
    });

    if (error) {
      throw error;
    }
  }
}

export const payerConnectionService = new PayerConnectionService();
