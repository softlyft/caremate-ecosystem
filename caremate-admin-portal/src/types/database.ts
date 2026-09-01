/** Re-export shared Postgres types + admin-only org billing tables until db-types regen. */
import type { Database as BaseDatabase, Json } from '@caremate/db-types';

export type {
  Json,
  Article,
  Provider,
  ProviderOrganization,
  PayerOrganization,
  PayerProfile,
  ProviderLocation,
  ProviderHealthcareService,
  ProviderProfile,
  HealthTip,
  AdRemoteConfig,
  AdCampaign,
  AdAdvertiser,
  AdCreative,
  AdPlacement,
  AdEvent,
  Profile,
  Settings,
  EmergencyProfile,
  EmergencyShareAccessLog,
  Bookmark,
  MiniAppSnapshot,
  SubscriptionPrice,
  Payment,
  Subscription,
  AdminAuditEvent,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@caremate/db-types';

type Timestamps = {
  created_at: string;
  updated_at: string;
};

type OrgBillingTables = {
  provider_org_plan_prices: {
    Row: {
      id: string;
      plan_tier: 'basic' | 'pro';
      billing_interval: 'monthly' | 'yearly';
      currency: 'NGN';
      amount_minor: number;
      provider: 'paystack';
      paystack_plan_code: string | null;
      pct_seat_limit: number;
      patient_connection_cap: number;
      payer_connection_cap: number;
      voice_minutes_included: number;
      video_minutes_included: number;
      is_active: boolean;
    } & Timestamps;
    Insert: Partial<OrgBillingTables['provider_org_plan_prices']['Row']> & { id: string };
    Update: Partial<OrgBillingTables['provider_org_plan_prices']['Row']>;
    Relationships: [];
  };
  provider_org_subscriptions: {
    Row: {
      id: string;
      organization_id: string;
      plan_tier: string;
      billing_interval: string;
      currency: string;
      provider: string;
      status: string;
      pct_seat_limit: number;
      patient_connection_cap: number;
      payer_connection_cap: number;
      voice_minutes_included: number;
      video_minutes_included: number;
      provider_customer_id: string | null;
      provider_subscription_id: string | null;
      provider_ref: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
    } & Timestamps;
    Insert: Partial<OrgBillingTables['provider_org_subscriptions']['Row']> & {
      organization_id: string;
    };
    Update: Partial<OrgBillingTables['provider_org_subscriptions']['Row']>;
    Relationships: [];
  };
  payer_org_plan_prices: {
    Row: {
      id: string;
      plan_tier: 'basic' | 'pro';
      billing_interval: 'monthly' | 'yearly';
      currency: 'NGN';
      amount_minor: number;
      provider: 'paystack';
      paystack_plan_code: string | null;
      support_team_seat_limit: number;
      patient_connection_cap: number;
      provider_connection_cap: number;
      voice_minutes_included: number;
      group_chat_enabled: boolean;
      is_active: boolean;
    } & Timestamps;
    Insert: Partial<OrgBillingTables['payer_org_plan_prices']['Row']> & { id: string };
    Update: Partial<OrgBillingTables['payer_org_plan_prices']['Row']>;
    Relationships: [];
  };
  payer_org_subscriptions: {
    Row: {
      id: string;
      organization_id: string;
      plan_tier: string;
      billing_interval: string;
      currency: string;
      provider: string;
      status: string;
      support_team_seat_limit: number;
      patient_connection_cap: number;
      provider_connection_cap: number;
      voice_minutes_included: number;
      group_chat_enabled: boolean;
      provider_customer_id: string | null;
      provider_subscription_id: string | null;
      provider_ref: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
    } & Timestamps;
    Insert: Partial<OrgBillingTables['payer_org_subscriptions']['Row']> & {
      organization_id: string;
    };
    Update: Partial<OrgBillingTables['payer_org_subscriptions']['Row']>;
    Relationships: [];
  };
};

export type Database = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: BaseDatabase['public']['Tables'] & OrgBillingTables;
    Functions: BaseDatabase['public']['Functions'] & {
      is_provider_org_claimed: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      is_payer_org_claimed: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      admin_grant_provider_org_subscription: {
        Args: {
          p_organization_id: string;
          p_plan_tier: string;
          p_billing_interval?: string;
          p_pct_seat_limit?: number;
          p_patient_connection_cap?: number;
          p_payer_connection_cap?: number;
          p_voice_minutes_included?: number;
          p_video_minutes_included?: number;
          p_period_months?: number;
        };
        Returns: Json;
      };
      admin_grant_payer_org_subscription: {
        Args: {
          p_organization_id: string;
          p_plan_tier: string;
          p_billing_interval?: string;
          p_support_team_seat_limit?: number;
          p_patient_connection_cap?: number;
          p_provider_connection_cap?: number;
          p_voice_minutes_included?: number;
          p_group_chat_enabled?: boolean;
          p_period_months?: number;
        };
        Returns: Json;
      };
    };
  };
};

