export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          user_id: string;
          full_name: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          notifications_enabled: boolean;
          subscribed_category_ids: Json;
          created_at: string;
          updated_at: string;
        };
      };
      emergency_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          created_at: string;
          updated_at: string;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          content: string | null;
          content_type: string;
          category_id: string | null;
          category_name: string | null;
          image_url: string | null;
          source_url: string | null;
          published_at: string | null;
          attributes: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          summary?: string | null;
          content?: string | null;
          content_type?: string;
          category_id?: string | null;
          category_name?: string | null;
          image_url?: string | null;
          source_url?: string | null;
          published_at?: string | null;
          attributes?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['articles']['Insert']>;
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
          created_at: string;
          updated_at: string;
        };
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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['providers']['Insert']>;
      };
      health_tips: {
        Row: {
          id: string;
          category_id: string;
          body: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          category_id: string;
          body: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['health_tips']['Insert']>;
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
      };
    };
  };
};

export type Article = Database['public']['Tables']['articles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type HealthTip = Database['public']['Tables']['health_tips']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
