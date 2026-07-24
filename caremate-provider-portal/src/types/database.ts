/**
 * Local types for Provider Portal tables until `@caremate/db-types` is regenerated
 * after migration `20260719140000_provider_portal.sql`.
 */
import type {
  Database as BaseDatabase,
  Json,
  Profile,
  EmergencyProfile,
  ProviderOrganization,
} from '@caremate/db-types';

export type { Json, Profile, EmergencyProfile, ProviderOrganization };

export type ProviderOrgType =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'laboratory'
  | 'imaging_centre'
  | 'blood_bank'
  | 'ambulance'
  | 'insurance';

export type ProviderMemberRole = 'owner' | 'administrator' | 'staff' | 'viewer';

export type ConnectionStatus = 'pending' | 'approved' | 'rejected';

export type BroadcastAudience = 'all' | 'selected';
export type BroadcastStatus = 'draft' | 'sent' | 'expired';

export type DocumentType =
  | 'prescription'
  | 'lab_result'
  | 'imaging_report'
  | 'referral_letter'
  | 'discharge_summary'
  | 'invoice';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'rescheduled';

export type VerificationStatus = 'pending' | 'verified' | 'suspended';

export type ProviderOrgClaim = {
  id: string;
  organization_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  verified_at: string | null;
  completed_at: string | null;
  attempts: number;
  created_at: string;
};

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type ProviderProfile = {
  id: string;
  organization_id: string;
  organization_type: ProviderOrgType;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  address: string | null;
  opening_hours: Json;
  emergency_contact: string | null;
  services_offered: string[];
  verification_status: VerificationStatus;
} & Timestamps;

export type ProviderOrgMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: ProviderMemberRole;
  display_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  position: string | null;
  deleted_at: string | null;
} & Timestamps;

export type ConnectionInitiatedBy = 'patient' | 'provider';

export type PatientProviderConnection = {
  id: string;
  patient_id: string;
  organization_id: string;
  status: ConnectionStatus;
  /** Who opened the request; the other party approves. */
  initiated_by: ConnectionInitiatedBy;
  shared_scopes: string[];
  patient_note: string | null;
  provider_note: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
} & Timestamps;

export type PatientProviderActivity = {
  id: string;
  organization_id: string;
  patient_id: string;
  connection_id: string | null;
  event_type: string;
  summary: string;
  metadata: Json;
  created_at: string;
};

export type ProviderBroadcast = {
  id: string;
  organization_id: string;
  title: string;
  message: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  expires_at: string | null;
  created_by: string | null;
  sent_at: string | null;
} & Timestamps;

export type ProviderBroadcastRecipient = {
  id: string;
  broadcast_id: string;
  patient_id: string;
  read_at: string | null;
  created_at: string;
};

export type ProviderDocument = {
  id: string;
  organization_id: string | null;
  patient_id: string;
  document_type: DocumentType;
  title: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by: string | null;
  source: 'provider' | 'patient';
} & Timestamps;

export type AppointmentRequest = {
  id: string;
  patient_id: string;
  organization_id: string;
  requested_date: string;
  requested_time: string | null;
  notes: string | null;
  status: AppointmentStatus;
  provider_note: string | null;
  rescheduled_date: string | null;
  rescheduled_time: string | null;
} & Timestamps;

type PortalTables = {
  provider_profiles: {
    Row: ProviderProfile;
    Insert: {
      id?: string;
      organization_id: string;
      organization_type?: ProviderOrgType;
      description?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      logo_url?: string | null;
      address?: string | null;
      opening_hours?: Json;
      emergency_contact?: string | null;
      services_offered?: string[];
      verification_status?: VerificationStatus;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_profiles']['Insert']>;
    Relationships: [];
  };
  provider_org_members: {
    Row: ProviderOrgMember;
    Insert: {
      id?: string;
      organization_id: string;
      user_id: string;
      role?: ProviderMemberRole;
      display_name?: string | null;
      company_email?: string | null;
      company_phone?: string | null;
      position?: string | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_org_members']['Insert']>;
    Relationships: [];
  };
  patient_provider_connections: {
    Row: PatientProviderConnection;
    Insert: {
      id?: string;
      patient_id: string;
      organization_id: string;
      status?: ConnectionStatus;
      initiated_by?: ConnectionInitiatedBy;
      shared_scopes?: string[];
      patient_note?: string | null;
      provider_note?: string | null;
      rejection_reason?: string | null;
      approved_at?: string | null;
      rejected_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['patient_provider_connections']['Insert']>;
    Relationships: [];
  };
  patient_provider_activities: {
    Row: PatientProviderActivity;
    Insert: {
      id?: string;
      organization_id: string;
      patient_id: string;
      connection_id?: string | null;
      event_type: string;
      summary: string;
      metadata?: Json;
      created_at?: string;
    };
    Update: Partial<PortalTables['patient_provider_activities']['Insert']>;
    Relationships: [];
  };
  provider_broadcasts: {
    Row: ProviderBroadcast;
    Insert: {
      id?: string;
      organization_id: string;
      title: string;
      message: string;
      audience?: BroadcastAudience;
      status?: BroadcastStatus;
      expires_at?: string | null;
      created_by?: string | null;
      sent_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_broadcasts']['Insert']>;
    Relationships: [];
  };
  provider_broadcast_recipients: {
    Row: ProviderBroadcastRecipient;
    Insert: {
      id?: string;
      broadcast_id: string;
      patient_id: string;
      read_at?: string | null;
      created_at?: string;
    };
    Update: Partial<PortalTables['provider_broadcast_recipients']['Insert']>;
    Relationships: [];
  };
  provider_documents: {
    Row: ProviderDocument;
    Insert: {
      id?: string;
      organization_id?: string | null;
      patient_id: string;
      document_type: DocumentType;
      title: string;
      file_url: string;
      file_name?: string | null;
      mime_type?: string | null;
      uploaded_by?: string | null;
      source?: 'provider' | 'patient';
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_documents']['Insert']>;
    Relationships: [];
  };
  appointment_requests: {
    Row: AppointmentRequest;
    Insert: {
      id?: string;
      patient_id: string;
      organization_id: string;
      requested_date: string;
      requested_time?: string | null;
      notes?: string | null;
      status?: AppointmentStatus;
      provider_note?: string | null;
      rescheduled_date?: string | null;
      rescheduled_time?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['appointment_requests']['Insert']>;
    Relationships: [];
  };
  provider_org_claims: {
    Row: ProviderOrgClaim;
    Insert: {
      id?: string;
      organization_id: string;
      email: string;
      code_hash: string;
      expires_at: string;
      verified_at?: string | null;
      completed_at?: string | null;
      attempts?: number;
      created_at?: string;
    };
    Update: Partial<PortalTables['provider_org_claims']['Insert']>;
    Relationships: [];
  };
};

type PortalFunctions = {
  is_provider_org_verified: {
    Args: { p_org_id: string };
    Returns: boolean;
  };
  request_provider_connection_by_caremate_id: {
    Args: {
      p_organization_id: string;
      p_caremate_id: string;
      p_provider_note?: string | null;
    };
    Returns: PatientProviderConnection;
  };
  request_patient_provider_connection: {
    Args: {
      p_organization_id: string;
      p_patient_note?: string | null;
    };
    Returns: PatientProviderConnection;
  };
  mark_connected_patient_as_staff: {
    Args: {
      p_organization_id: string;
      p_patient_user_id: string;
      p_company_email?: string;
      p_company_phone?: string;
      p_position?: string;
      p_display_name?: string;
    };
    Returns: ProviderOrgMember;
  };
};

export type Database = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: BaseDatabase['public']['Tables'] & PortalTables;
    Functions: BaseDatabase['public']['Functions'] & PortalFunctions;
  };
};
