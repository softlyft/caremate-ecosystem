/**
 * Local types for Care Portal tables until `@caremate/db-types` is fully regenerated
 * for remaining portal-only tables (provider_profiles overlay, claims, messaging, …).
 * Payer catalog tables live in `@caremate/db-types`.
 */
import type {
  Database as BaseDatabase,
  Json,
  Profile,
  EmergencyProfile,
  ProviderOrganization,
  ProviderLocation,
  ProviderHealthcareService,
  PayerOrganization,
  PayerProfile,
  PayerOrgMember,
  PayerOrgClaim,
  ProviderPayerConnection as BaseProviderPayerConnection,
} from '@caremate/db-types';

export type {
  Json,
  Profile,
  EmergencyProfile,
  ProviderOrganization,
  ProviderLocation,
  ProviderHealthcareService,
  PayerOrganization,
  PayerProfile,
  PayerOrgMember,
  PayerOrgClaim,
};

/** Extended payer member row including Support Team billing columns (until db-types regen). */
export type PayerOrgMemberRow = PayerOrgMember & {
  company_email: string | null;
  company_phone: string | null;
  position: string | null;
  support_team: boolean;
};

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

export type ConnectionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'disconnected';

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
  | 'rescheduled'
  | 'checked_in'
  | 'cancelled';

export type AppointmentSource = 'patient_request' | 'provider_scheduled';

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

export type ProviderPasswordReset = {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  verified_at: string | null;
  consumed_at: string | null;
  attempts: number;
  created_at: string;
};

export type CareOrgKind = 'provider' | 'payer';

export type ProviderAuthOtpSend = {
  id: string;
  kind: 'claim' | 'password_reset' | 'payer_claim';
  email: string;
  ip_hash: string | null;
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
  private_care_team: boolean;
  deleted_at: string | null;
} & Timestamps;

export type ConnectionInitiatedBy = 'patient' | 'provider';

export type ProviderPayerInitiatedBy = 'provider' | 'payer';

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
  cancelled_at: string | null;
  disconnected_at: string | null;
  disconnected_by: ConnectionInitiatedBy | null;
} & Timestamps;

export type ProviderPayerConnection = Omit<
  BaseProviderPayerConnection,
  'status' | 'initiated_by'
> & {
  status: ConnectionStatus;
  initiated_by: ProviderPayerInitiatedBy;
};

export type PatientPayerInitiatedBy = 'patient' | 'payer';

export type PatientPayerConnection = {
  id: string;
  patient_id: string;
  payer_organization_id: string;
  status: ConnectionStatus;
  initiated_by: PatientPayerInitiatedBy;
  patient_note: string | null;
  payer_note: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  disconnected_at: string | null;
  disconnected_by: PatientPayerInitiatedBy | null;
} & Timestamps;

export type PatientPayerActivity = {
  id: string;
  payer_organization_id: string;
  patient_id: string;
  connection_id: string | null;
  event_type: string;
  summary: string;
  metadata: Json;
  created_at: string;
};

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

export type PayerDocument = {
  id: string;
  payer_organization_id: string;
  patient_id: string;
  document_type: DocumentType;
  title: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by: string | null;
  source: 'payer';
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
  source?: AppointmentSource;
  created_by?: string | null;
  checked_in_at?: string | null;
} & Timestamps;

export type LabOrderStatus =
  | 'ordered'
  | 'sample_collected'
  | 'processing'
  | 'awaiting_validation'
  | 'validated'
  | 'reported'
  | 'cancelled';

export type LabTestDefinition = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string;
  specimen_type: string;
  unit: string | null;
  reference_range: string | null;
  active: boolean;
} & Timestamps;

export type LabOrder = {
  id: string;
  organization_id: string;
  patient_id: string;
  status: LabOrderStatus;
  clinical_notes: string | null;
  ordered_by: string | null;
  ordered_at: string;
  sample_collected_at: string | null;
  sample_collected_by: string | null;
  specimen_type: string | null;
  processing_started_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  reported_at: string | null;
  patient_notified_at: string | null;
} & Timestamps;

export type LabOrderItem = {
  id: string;
  order_id: string;
  test_definition_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  result_flag: 'normal' | 'low' | 'high' | 'critical' | 'abnormal' | null;
  result_notes: string | null;
} & Timestamps;

export type AppointmentAvailability = {
  id: string;
  organization_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
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
      cancelled_at?: string | null;
      disconnected_at?: string | null;
      disconnected_by?: ConnectionInitiatedBy | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['patient_provider_connections']['Insert']>;
    Relationships: [];
  };
  patient_payer_connections: {
    Row: PatientPayerConnection;
    Insert: {
      id?: string;
      patient_id: string;
      payer_organization_id: string;
      status?: ConnectionStatus;
      initiated_by: PatientPayerInitiatedBy;
      patient_note?: string | null;
      payer_note?: string | null;
      rejection_reason?: string | null;
      approved_at?: string | null;
      rejected_at?: string | null;
      cancelled_at?: string | null;
      disconnected_at?: string | null;
      disconnected_by?: PatientPayerInitiatedBy | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['patient_payer_connections']['Insert']>;
    Relationships: [];
  };
  provider_payer_connections: {
    Row: ProviderPayerConnection;
    Insert: {
      id?: string;
      provider_organization_id: string;
      payer_organization_id: string;
      status?: ConnectionStatus;
      initiated_by: ProviderPayerInitiatedBy;
      provider_note?: string | null;
      payer_note?: string | null;
      rejection_reason?: string | null;
      approved_at?: string | null;
      rejected_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_payer_connections']['Insert']>;
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
  patient_payer_activities: {
    Row: PatientPayerActivity;
    Insert: {
      id?: string;
      payer_organization_id: string;
      patient_id: string;
      connection_id?: string | null;
      event_type: string;
      summary: string;
      metadata?: Json;
      created_at?: string;
    };
    Update: Partial<PortalTables['patient_payer_activities']['Insert']>;
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
  payer_documents: {
    Row: PayerDocument;
    Insert: {
      id?: string;
      payer_organization_id: string;
      patient_id: string;
      document_type: DocumentType;
      title: string;
      file_url: string;
      file_name?: string | null;
      mime_type?: string | null;
      uploaded_by?: string | null;
      source?: 'payer';
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['payer_documents']['Insert']>;
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
      source?: AppointmentSource;
      created_by?: string | null;
      checked_in_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['appointment_requests']['Insert']>;
    Relationships: [];
  };
  provider_org_modules: {
    Row: {
      id: string;
      organization_id: string;
      module_key: string;
      enabled: boolean;
      enabled_at: string | null;
      enabled_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      module_key: string;
      enabled?: boolean;
      enabled_at?: string | null;
      enabled_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_org_modules']['Insert']>;
    Relationships: [];
  };
  provider_appointment_availability: {
    Row: AppointmentAvailability;
    Insert: {
      id?: string;
      organization_id: string;
      weekday: number;
      start_time: string;
      end_time: string;
      slot_minutes?: number;
      active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['provider_appointment_availability']['Insert']>;
    Relationships: [];
  };
  lab_test_definitions: {
    Row: LabTestDefinition;
    Insert: {
      id?: string;
      organization_id: string;
      code: string;
      name: string;
      description?: string;
      specimen_type?: string;
      unit?: string | null;
      reference_range?: string | null;
      active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['lab_test_definitions']['Insert']>;
    Relationships: [];
  };
  lab_orders: {
    Row: LabOrder;
    Insert: {
      id?: string;
      organization_id: string;
      patient_id: string;
      status?: LabOrderStatus;
      clinical_notes?: string | null;
      ordered_by?: string | null;
      ordered_at?: string;
      sample_collected_at?: string | null;
      sample_collected_by?: string | null;
      specimen_type?: string | null;
      processing_started_at?: string | null;
      validated_at?: string | null;
      validated_by?: string | null;
      reported_at?: string | null;
      patient_notified_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['lab_orders']['Insert']>;
    Relationships: [];
  };
  lab_order_items: {
    Row: LabOrderItem;
    Insert: {
      id?: string;
      order_id: string;
      test_definition_id: string;
      status?: 'pending' | 'completed' | 'cancelled';
      result_value?: string | null;
      result_unit?: string | null;
      reference_range?: string | null;
      result_flag?: LabOrderItem['result_flag'];
      result_notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<PortalTables['lab_order_items']['Insert']>;
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
  provider_password_resets: {
    Row: ProviderPasswordReset;
    Insert: {
      id?: string;
      user_id: string;
      email: string;
      code_hash: string;
      expires_at: string;
      verified_at?: string | null;
      consumed_at?: string | null;
      attempts?: number;
      created_at?: string;
    };
    Update: Partial<PortalTables['provider_password_resets']['Insert']>;
    Relationships: [];
  };
  provider_auth_otp_sends: {
    Row: ProviderAuthOtpSend;
    Insert: {
      id?: string;
      kind: 'claim' | 'password_reset' | 'payer_claim';
      email: string;
      ip_hash?: string | null;
      created_at?: string;
    };
    Update: Partial<PortalTables['provider_auth_otp_sends']['Insert']>;
    Relationships: [];
  };
};

type PortalFunctions = {
  is_provider_org_verified: {
    Args: { p_org_id: string };
    Returns: boolean;
  };
  get_auth_user_id_by_email: {
    Args: { p_email: string };
    Returns: string | null;
  };
  find_unclaimed_orgs_by_contact_email: {
    Args: { p_email: string };
    Returns: { id: string; name: string }[];
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
  request_provider_payer_connection_by_email: {
    Args: {
      p_provider_organization_id: string;
      p_payer_claim_email: string;
      p_provider_note?: string | null;
    };
    Returns: ProviderPayerConnection;
  };
  request_payer_provider_connection_by_email: {
    Args: {
      p_payer_organization_id: string;
      p_provider_claim_email: string;
      p_payer_note?: string | null;
    };
    Returns: ProviderPayerConnection;
  };
  respond_patient_provider_connection: {
    Args: {
      p_connection_id: string;
      p_accept: boolean;
      p_rejection_reason?: string | null;
      p_note?: string | null;
    };
    Returns: PatientProviderConnection;
  };
  cancel_pending_patient_provider_connection: {
    Args: {
      p_connection_id: string;
      p_reason: string;
    };
    Returns: PatientProviderConnection;
  };
  disconnect_patient_provider_connection: {
    Args: {
      p_connection_id: string;
      p_reason?: string | null;
    };
    Returns: PatientProviderConnection;
  };
  cancel_pending_provider_payer_connection: {
    Args: {
      p_connection_id: string;
      p_reason: string;
    };
    Returns: ProviderPayerConnection;
  };
  disconnect_provider_payer_connection: {
    Args: {
      p_connection_id: string;
      p_reason?: string | null;
    };
    Returns: ProviderPayerConnection;
  };
  request_payer_patient_connection_by_caremate_id: {
    Args: {
      p_payer_organization_id: string;
      p_caremate_id: string;
      p_payer_note?: string | null;
    };
    Returns: PatientPayerConnection;
  };
  respond_patient_payer_connection: {
    Args: {
      p_connection_id: string;
      p_accept: boolean;
      p_rejection_reason?: string | null;
      p_note?: string | null;
    };
    Returns: PatientPayerConnection;
  };
  cancel_pending_patient_payer_connection: {
    Args: {
      p_connection_id: string;
      p_reason: string;
    };
    Returns: PatientPayerConnection;
  };
  disconnect_patient_payer_connection: {
    Args: {
      p_connection_id: string;
      p_reason?: string | null;
    };
    Returns: PatientPayerConnection;
  };
  send_payer_org_message: {
    Args: {
      p_payer_organization_id: string;
      p_body: string;
      p_subject?: string | null;
      p_audience?: string;
      p_patient_ids?: string[];
      p_expires_at?: string | null;
    };
    Returns: Json;
  };
  post_payer_org_message: {
    Args: {
      p_conversation_id: string;
      p_body: string;
    };
    Returns: Json;
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
  provider_org_entitlements: {
    Args: { p_org_id: string };
    Returns: Json;
  };
  provider_org_pct_member_count: {
    Args: { p_org_id: string };
    Returns: number;
  };
  provider_org_approved_patient_count: {
    Args: { p_org_id: string };
    Returns: number;
  };
  set_private_care_team_member: {
    Args: {
      p_organization_id: string;
      p_user_id: string;
      p_enabled: boolean;
    };
    Returns: ProviderOrgMember;
  };
  mark_connected_patient_as_payer_staff: {
    Args: {
      p_organization_id: string;
      p_patient_user_id: string;
      p_company_email?: string;
      p_company_phone?: string;
      p_position?: string;
      p_display_name?: string;
    };
    Returns: PayerOrgMemberRow;
  };
  payer_org_entitlements: {
    Args: { p_org_id: string };
    Returns: Json;
  };
  payer_org_support_team_member_count: {
    Args: { p_org_id: string };
    Returns: number;
  };
  payer_org_approved_patient_count: {
    Args: { p_org_id: string };
    Returns: number;
  };
  set_support_team_member: {
    Args: {
      p_organization_id: string;
      p_user_id: string;
      p_enabled: boolean;
    };
    Returns: PayerOrgMemberRow;
  };
  admin_grant_payer_org_subscription: {
    Args: {
      p_organization_id: string;
      p_plan_tier: string;
      p_billing_interval?: string;
      p_support_team_seat_limit?: number;
      p_patient_connection_cap?: number;
      p_voice_minutes_included?: number;
      p_group_chat_enabled?: boolean;
      p_period_months?: number;
    };
    Returns: Json;
  };
  rebuild_provider_projection_for_location: {
    Args: {
      p_location_id: string;
    };
    Returns: undefined;
  };
};

export type Database = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: BaseDatabase['public']['Tables'] & PortalTables;
    Functions: BaseDatabase['public']['Functions'] & PortalFunctions;
  };
};
