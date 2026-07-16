export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          avatar_url: string | null;
          country_code: string | null;
          state: string | null;
          patient_id: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          country_code?: string | null;
          state?: string | null;
          patient_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          notifications_enabled: boolean;
          subscribed_category_ids: Json;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          theme?: string;
          notifications_enabled?: boolean;
          subscribed_category_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
        Relationships: [];
      };
      emergency_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          photo_url: string | null;
          blood_group: string | null;
          genotype: string | null;
          allergies: Json;
          current_medications: Json;
          chronic_conditions: Json;
          emergency_contacts: Json;
          preferred_hospital: string | null;
          insurance_provider: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          full_name: string;
          photo_url?: string | null;
          blood_group?: string | null;
          genotype?: string | null;
          allergies?: Json;
          current_medications?: Json;
          chronic_conditions?: Json;
          emergency_contacts?: Json;
          preferred_hospital?: string | null;
          insurance_provider?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['emergency_profiles']['Insert']>;
        Relationships: [];
      };
      providers: {
        Row: {
          id: string;
          name: string;
          type: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          latitude: number | null;
          longitude: number | null;
          distance_km: number | null;
          attributes: Json;
          external_id: string | null;
          source: string | null;
          active: boolean;
          last_ingested_at: string | null;
          deleted_at: string | null;
          organization_id: string | null;
          location_id: string | null;
          healthcare_service_ids: Json;
        } & Timestamps;
        Insert: {
          id: string;
          name: string;
          type: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          distance_km?: number | null;
          attributes?: Json;
          external_id?: string | null;
          source?: string | null;
          active?: boolean;
          last_ingested_at?: string | null;
          deleted_at?: string | null;
          organization_id?: string | null;
          location_id?: string | null;
          healthcare_service_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['providers']['Insert']>;
        Relationships: [];
      };
      provider_organizations: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          resource: Json;
          source: string | null;
          last_ingested_at: string | null;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          /** Omit on insert — Postgres gen_random_uuid(). Supply UUID to update via ingest. */
          id?: string;
          name: string;
          active?: boolean;
          resource?: Json;
          source?: string | null;
          last_ingested_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_organizations']['Insert']>;
        Relationships: [];
      };
      provider_locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          status: string;
          latitude: number | null;
          longitude: number | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          distance_km: number | null;
          resource: Json;
          source: string | null;
          last_ingested_at: string | null;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          status?: string;
          latitude?: number | null;
          longitude?: number | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          distance_km?: number | null;
          resource?: Json;
          source?: string | null;
          last_ingested_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_locations']['Insert']>;
        Relationships: [];
      };
      provider_healthcare_services: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string | null;
          name: string;
          active: boolean;
          service_type: string | null;
          resource: Json;
          source: string | null;
          last_ingested_at: string | null;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          organization_id: string;
          location_id?: string | null;
          name: string;
          active?: boolean;
          service_type?: string | null;
          resource?: Json;
          source?: string | null;
          last_ingested_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_healthcare_services']['Insert']>;
        Relationships: [];
      };
      provider_favorites: {
        Row: {
          provider_id: string;
          user_id: string;
          is_favorite: boolean;
          updated_at: string;
        };
        Insert: {
          provider_id: string;
          user_id: string;
          is_favorite?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_favorites']['Insert']>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          content: string;
          content_type: string;
          category_id: string;
          category_name: string;
          image_url: string | null;
          source_url: string | null;
          published_at: string | null;
          attributes: Json;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          title: string;
          summary?: string | null;
          content: string;
          content_type?: string;
          category_id: string;
          category_name: string;
          image_url?: string | null;
          source_url?: string | null;
          published_at?: string | null;
          attributes?: Json;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['articles']['Insert']>;
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
        } & Timestamps;
        Insert: {
          id: string;
          article_id: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bookmarks']['Insert']>;
        Relationships: [];
      };
      mini_app_snapshots: {
        Row: {
          id: string;
          user_id: string;
          app_key: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          app_key: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mini_app_snapshots']['Insert']>;
        Relationships: [];
      };
      family_households: {
        Row: {
          id: string;
          created_by_user_id: string;
          name: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          created_by_user_id: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['family_households']['Insert']>;
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          household_id: string;
          kind: string;
          linked_user_id: string | null;
          full_name: string;
          date_of_birth: string | null;
          gender: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          household_id: string;
          kind: string;
          linked_user_id?: string | null;
          full_name: string;
          date_of_birth?: string | null;
          gender?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['family_members']['Insert']>;
        Relationships: [];
      };
      family_connection_requests: {
        Row: {
          id: string;
          household_id: string;
          from_user_id: string;
          to_user_id: string | null;
          to_email: string | null;
          to_phone: string | null;
          status: string;
          invite_token: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          household_id: string;
          from_user_id: string;
          to_user_id?: string | null;
          to_email?: string | null;
          to_phone?: string | null;
          status?: string;
          invite_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['family_connection_requests']['Insert']>;
        Relationships: [];
      };
      health_tips: {
        Row: {
          id: string;
          category_id: string;
          body: string;
          sort_order: number;
          is_active: boolean;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          category_id: string;
          body: string;
          sort_order?: number;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['health_tips']['Insert']>;
        Relationships: [];
      };
      admin_audit_events: {
        Row: {
          id: string;
          actor_user_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_audit_events']['Insert']>;
        Relationships: [];
      };
      subscription_prices: {
        Row: {
          id: string;
          plan_type: string;
          billing_interval: string;
          currency: string;
          amount_minor: number;
          provider: string;
          stripe_price_id: string | null;
          paystack_plan_code: string | null;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id: string;
          plan_type: string;
          billing_interval: string;
          currency: string;
          amount_minor: number;
          provider: string;
          stripe_price_id?: string | null;
          paystack_plan_code?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscription_prices']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          plan_type: string;
          billing_interval: string;
          currency: string;
          provider: string;
          status: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          provider_ref: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          household_id?: string | null;
          plan_type: string;
          billing_interval: string;
          currency: string;
          provider: string;
          status?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          provider_ref?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_providers: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_km?: number;
          p_type?: string | null;
          p_search?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          name: string;
          type: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          latitude: number | null;
          longitude: number | null;
          distance_km: number;
          attributes: Json;
          organization_id: string | null;
          location_id: string | null;
          healthcare_service_ids: Json;
          external_id: string | null;
          source: string | null;
          active: boolean;
          last_ingested_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      ensure_provider_catalog_stub: {
        Args: {
          p_id: string;
          p_name: string;
          p_type: string;
          p_address?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_latitude?: number | null;
          p_longitude?: number | null;
          p_distance_km?: number | null;
          p_attributes?: Json;
          p_updated_at?: string;
        };
        Returns: undefined;
      };
      lookup_user_for_family_connect: {
        Args: { p_query: string };
        Returns: {
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          country_code: string | null;
          state: string | null;
          avatar_url: string | null;
        }[];
      };
      create_family_connection_request: {
        Args: {
          p_household_id: string;
          p_to_user_id?: string | null;
          p_to_email?: string | null;
          p_to_phone?: string | null;
          p_invite_token?: string | null;
        };
        Returns: Database['public']['Tables']['family_connection_requests']['Row'];
      };
      respond_family_connection_request: {
        Args: {
          p_request_id: string;
          p_accept: boolean;
          p_self_full_name?: string;
        };
        Returns: Database['public']['Tables']['family_connection_requests']['Row'];
      };
      is_household_member: {
        Args: { p_household_id: string };
        Returns: boolean;
      };
      jwt_role: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_edit_catalog: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Article = Database['public']['Tables']['articles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ProviderOrganization = Database['public']['Tables']['provider_organizations']['Row'];
export type ProviderLocation = Database['public']['Tables']['provider_locations']['Row'];
export type ProviderHealthcareService =
  Database['public']['Tables']['provider_healthcare_services']['Row'];
export type HealthTip = Database['public']['Tables']['health_tips']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type EmergencyProfile = Database['public']['Tables']['emergency_profiles']['Row'];
export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type MiniAppSnapshot = Database['public']['Tables']['mini_app_snapshots']['Row'];
export type SubscriptionPrice = Database['public']['Tables']['subscription_prices']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
