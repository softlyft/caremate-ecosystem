export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_advertisers: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          org_type: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by_user_id: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          logo_url?: string | null
          name: string
          org_type?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_type?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_id: string | null
          country_codes: Json
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          frequency_cap_per_day: number
          id: string
          name: string
          priority: number
          source: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          country_codes?: Json
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          frequency_cap_per_day?: number
          id: string
          name: string
          priority?: number
          source?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          country_codes?: Json
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          frequency_cap_per_day?: number
          id?: string
          name?: string
          priority?: number
          source?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "ad_advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          badge_label: string | null
          body: string
          campaign_id: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          body: string
          campaign_id: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          deleted_at?: string | null
          id: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          body?: string
          campaign_id?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          ad_unit_id: string | null
          campaign_id: string | null
          created_at: string
          creative_id: string | null
          event_type: string
          id: string
          slot_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          ad_unit_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          event_type: string
          id: string
          slot_id: string
          source?: string
          user_id?: string | null
        }
        Update: {
          ad_unit_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          event_type?: string
          id?: string
          slot_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ad_placements: {
        Row: {
          campaign_id: string
          created_at: string
          deleted_at: string | null
          id: string
          slot_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          slot_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_remote_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      admin_audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          provider_note: string | null
          requested_date: string
          requested_time: string | null
          rescheduled_date: string | null
          rescheduled_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          provider_note?: string | null
          requested_date: string
          requested_time?: string | null
          rescheduled_date?: string | null
          rescheduled_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          provider_note?: string | null
          requested_date?: string
          requested_time?: string | null
          rescheduled_date?: string | null
          rescheduled_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      article_reads: {
        Row: {
          article_id: string
          created_at: string
          id: string
          opened_at: string
          read_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id: string
          opened_at?: string
          read_at?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          opened_at?: string
          read_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          attributes: Json
          category_id: string
          category_name: string
          content: string
          content_type: string
          created_at: string
          deleted_at: string | null
          first_seen_at: string | null
          id: string
          image_url: string | null
          published_at: string | null
          source_url: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          category_id: string
          category_name: string
          content: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          first_seen_at?: string | null
          id: string
          image_url?: string | null
          published_at?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          category_id?: string
          category_name?: string
          content?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          first_seen_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkout_handoffs: {
        Row: {
          access_token: string | null
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_announcement_bookmarks: {
        Row: {
          announcement_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcement_bookmarks_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "community_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          reaction: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          reaction?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "community_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          body: string
          chapter_id: string
          created_at: string
          id: string
          published_at: string
          published_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          chapter_id: string
          created_at?: string
          id?: string
          published_at?: string
          published_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          chapter_id?: string
          created_at?: string
          id?: string
          published_at?: string
          published_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_announcements_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_badges: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          points_value: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_value?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_value?: number
          slug?: string
        }
        Relationships: []
      }
      community_certificates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          template_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          template_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          template_url?: string | null
        }
        Relationships: []
      }
      community_chapter_requests: {
        Row: {
          administrative_hierarchy: Json
          chapter_type: string
          city_id: string | null
          country_code: string
          created_at: string
          created_chapter_id: string | null
          description: string | null
          id: string
          name: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          administrative_hierarchy?: Json
          chapter_type?: string
          city_id?: string | null
          country_code: string
          created_at?: string
          created_chapter_id?: string | null
          description?: string | null
          id?: string
          name: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          administrative_hierarchy?: Json
          chapter_type?: string
          city_id?: string | null
          country_code?: string
          created_at?: string
          created_chapter_id?: string | null
          description?: string | null
          id?: string
          name?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_chapter_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "community_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chapter_requests_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "community_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "community_chapter_requests_created_chapter_id_fkey"
            columns: ["created_chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chapter_requests_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "community_states"
            referencedColumns: ["id"]
          },
        ]
      }
      community_chapters: {
        Row: {
          achievements: Json
          administrative_hierarchy: Json
          chapter_type: string
          city_id: string | null
          country_code: string
          cover_image_url: string | null
          created_at: string
          deputy_user_id: string | null
          description: string | null
          id: string
          lead_user_id: string | null
          logo_url: string | null
          member_count: number
          name: string
          slug: string
          state_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          achievements?: Json
          administrative_hierarchy?: Json
          chapter_type?: string
          city_id?: string | null
          country_code: string
          cover_image_url?: string | null
          created_at?: string
          deputy_user_id?: string | null
          description?: string | null
          id?: string
          lead_user_id?: string | null
          logo_url?: string | null
          member_count?: number
          name: string
          slug: string
          state_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          achievements?: Json
          administrative_hierarchy?: Json
          chapter_type?: string
          city_id?: string | null
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          deputy_user_id?: string | null
          description?: string | null
          id?: string
          lead_user_id?: string | null
          logo_url?: string | null
          member_count?: number
          name?: string
          slug?: string
          state_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_chapters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "community_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_chapters_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "community_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "community_chapters_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "community_states"
            referencedColumns: ["id"]
          },
        ]
      }
      community_cities: {
        Row: {
          id: string
          name: string
          state_id: string
        }
        Insert: {
          id?: string
          name: string
          state_id: string
        }
        Update: {
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "community_states"
            referencedColumns: ["id"]
          },
        ]
      }
      community_contributions: {
        Row: {
          action_type: string
          chapter_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          points: number
          recorded_by: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          points?: number
          recorded_by?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          points?: number
          recorded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_contributions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_countries: {
        Row: {
          administrative_level_config: Json
          administrative_options: Json
          code: string
          created_at: string
          name: string
        }
        Insert: {
          administrative_level_config?: Json
          administrative_options?: Json
          code: string
          created_at?: string
          name: string
        }
        Update: {
          administrative_level_config?: Json
          administrative_options?: Json
          code?: string
          created_at?: string
          name?: string
        }
        Relationships: []
      }
      community_event_registrations: {
        Row: {
          attended_at: string | null
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          attended_at?: string | null
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          banner_url: string | null
          capacity: number | null
          chapter_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          registration_deadline: string | null
          registration_open: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          chapter_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          chapter_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_gallery_items: {
        Row: {
          caption: string | null
          chapter_id: string
          created_at: string
          event_id: string | null
          id: string
          image_url: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          chapter_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          chapter_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_gallery_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_gallery_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          session_token_hash: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          session_token_hash?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          session_token_hash?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_path: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_profiles: {
        Row: {
          bio: string | null
          city_id: string | null
          contributor_category: string | null
          country_code: string | null
          created_at: string
          full_name: string
          interests: string[]
          onboarding_completed_at: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          skills: string[]
          state_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          city_id?: string | null
          contributor_category?: string | null
          country_code?: string | null
          created_at?: string
          full_name: string
          interests?: string[]
          onboarding_completed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          skills?: string[]
          state_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          city_id?: string | null
          contributor_category?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string
          interests?: string[]
          onboarding_completed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          skills?: string[]
          state_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "community_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "community_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "community_profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "community_states"
            referencedColumns: ["id"]
          },
        ]
      }
      community_resources: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string | null
          file_size_bytes: number | null
          id: string
          is_global: boolean
          mime_type: string | null
          storage_path: string
          tags: string[]
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          is_global?: boolean
          mime_type?: string | null
          storage_path: string
          tags?: string[]
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          is_global?: boolean
          mime_type?: string | null
          storage_path?: string
          tags?: string[]
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_states: {
        Row: {
          code: string
          country_code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          country_code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          country_code?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_states_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "community_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      community_user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "community_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      community_user_certificates: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          certificate_id: string
          certificate_url: string | null
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          certificate_id: string
          certificate_url?: string | null
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          certificate_id?: string
          certificate_url?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_user_certificates_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "community_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_profiles: {
        Row: {
          allergies: Json
          blood_group: string | null
          chronic_conditions: Json
          created_at: string
          current_medications: Json
          emergency_contacts: Json
          full_name: string
          genotype: string | null
          id: string
          insurance_provider: string | null
          notes: string | null
          photo_url: string | null
          preferred_hospital: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: Json
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          current_medications?: Json
          emergency_contacts?: Json
          full_name: string
          genotype?: string | null
          id: string
          insurance_provider?: string | null
          notes?: string | null
          photo_url?: string | null
          preferred_hospital?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: Json
          blood_group?: string | null
          chronic_conditions?: Json
          created_at?: string
          current_medications?: Json
          emergency_contacts?: Json
          full_name?: string
          genotype?: string | null
          id?: string
          insurance_provider?: string | null
          notes?: string | null
          photo_url?: string | null
          preferred_hospital?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_connect_lookup_attempts: {
        Row: {
          attempted_at: string
          id: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      family_connection_requests: {
        Row: {
          created_at: string
          from_user_id: string
          household_id: string
          id: string
          invite_token: string | null
          status: string
          to_email: string | null
          to_phone: string | null
          to_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          household_id: string
          id: string
          invite_token?: string | null
          status?: string
          to_email?: string | null
          to_phone?: string | null
          to_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          household_id?: string
          id?: string
          invite_token?: string | null
          status?: string
          to_email?: string | null
          to_phone?: string | null
          to_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_connection_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "family_households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_households: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          household_id: string
          id: string
          kind: string
          linked_user_id: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          household_id: string
          id: string
          kind: string
          linked_user_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          household_id?: string
          id?: string
          kind?: string
          linked_user_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "family_households"
            referencedColumns: ["id"]
          },
        ]
      }
      health_tips: {
        Row: {
          body: string
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          category_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_conversations: {
        Row: {
          created_at: string
          id: string
          kind: string
          last_message_at: string | null
          last_message_preview: string | null
          organization_id: string | null
          patient_user_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          last_message_at?: string | null
          last_message_preview?: string | null
          organization_id?: string | null
          patient_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          organization_id?: string | null
          patient_user_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_direct_pairs: {
        Row: {
          conversation_id: string
          created_at: string
          organization_id: string
          user_high: string
          user_low: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          organization_id: string
          user_high: string
          user_low: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          organization_id?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_direct_pairs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "message_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_direct_pairs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          sender_organization_id: string | null
          sender_party_type: string
          sender_user_id: string | null
          subject: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_organization_id?: string | null
          sender_party_type: string
          sender_user_id?: string | null
          subject?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_organization_id?: string | null
          sender_party_type?: string
          sender_user_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "message_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_messages_sender_organization_id_fkey"
            columns: ["sender_organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          organization_id: string | null
          party_type: string
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          organization_id?: string | null
          party_type: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          organization_id?: string | null
          party_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "message_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_app_snapshots: {
        Row: {
          app_key: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          app_key: string
          id: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          app_key?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          error: string | null
          id: string
          notification_id: string
          provider: string | null
          provider_message_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id: string
          provider?: string | null
          provider_message_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string
          provider?: string | null
          provider_message_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_devices: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          last_seen_at?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          dedupe_key: string | null
          domain: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          read_at: string | null
          severity: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          domain: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          read_at?: string | null
          severity?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          domain?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          read_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_provider_activities: {
        Row: {
          connection_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          patient_id: string
          summary: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          patient_id: string
          summary: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          patient_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_provider_activities_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "patient_provider_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_provider_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_provider_connections: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          initiated_by: string
          organization_id: string
          patient_id: string
          patient_note: string | null
          provider_note: string | null
          rejected_at: string | null
          rejection_reason: string | null
          shared_scopes: string[]
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          initiated_by?: string
          organization_id: string
          patient_id: string
          patient_note?: string | null
          provider_note?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          shared_scopes?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          initiated_by?: string
          organization_id?: string
          patient_id?: string
          patient_note?: string | null
          provider_note?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          shared_scopes?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_provider_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          billing_interval: string
          created_at: string
          currency: string
          failure_reason: string | null
          household_id: string | null
          id: string
          metadata: Json
          paid_at: string | null
          plan_type: string
          provider: string
          provider_customer_id: string | null
          provider_reference: string
          provider_transaction_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          billing_interval: string
          created_at?: string
          currency: string
          failure_reason?: string | null
          household_id?: string | null
          id: string
          metadata?: Json
          paid_at?: string | null
          plan_type: string
          provider: string
          provider_customer_id?: string | null
          provider_reference: string
          provider_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          household_id?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan_type?: string
          provider?: string
          provider_customer_id?: string | null
          provider_reference?: string
          provider_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "family_households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line: string | null
          avatar_url: string | null
          city: string | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_share_token: string | null
          full_name: string
          gender: string | null
          id: string
          is_health_practitioner: boolean
          language_code: string | null
          marital_status: string | null
          national_id: string | null
          patient_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_share_token?: string | null
          full_name: string
          gender?: string | null
          id: string
          is_health_practitioner?: boolean
          language_code?: string | null
          marital_status?: string | null
          national_id?: string | null
          patient_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_share_token?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_health_practitioner?: boolean
          language_code?: string | null
          marital_status?: string | null
          national_id?: string | null
          patient_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          id: string
          patient_id: string
          read_at: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          id?: string
          patient_id: string
          read_at?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "provider_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_broadcasts: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          organization_id: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          organization_id: string
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          organization_id?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string | null
          file_url: string
          id: string
          mime_type: string | null
          organization_id: string | null
          patient_id: string
          source: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          organization_id?: string | null
          patient_id: string
          source?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          organization_id?: string | null
          patient_id?: string
          source?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_favorites: {
        Row: {
          is_favorite: boolean
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_favorite?: boolean
          provider_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_favorite?: boolean
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_healthcare_services: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          id: string
          last_ingested_at: string | null
          location_id: string | null
          name: string
          organization_id: string
          resource: Json
          service_type: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_ingested_at?: string | null
          location_id?: string | null
          name: string
          organization_id: string
          resource?: Json
          service_type?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_ingested_at?: string | null
          location_id?: string | null
          name?: string
          organization_id?: string
          resource?: Json
          service_type?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_healthcare_services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "provider_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_healthcare_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_locations: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          distance_km: number | null
          email: string | null
          id: string
          last_ingested_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string
          phone: string | null
          resource: Json
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          email?: string | null
          id?: string
          last_ingested_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          phone?: string | null
          resource?: Json
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          email?: string | null
          id?: string
          last_ingested_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          phone?: string | null
          resource?: Json
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_org_claims: {
        Row: {
          attempts: number
          code_hash: string
          completed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          organization_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          completed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          organization_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          completed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_org_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_org_members: {
        Row: {
          company_email: string | null
          company_phone: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          organization_id: string
          position: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_email?: string | null
          company_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          organization_id: string
          position?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_email?: string | null
          company_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          organization_id?: string
          position?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_organizations: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          id: string
          last_ingested_at: string | null
          name: string
          resource: Json
          source: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_ingested_at?: string | null
          name: string
          resource?: Json
          source?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_ingested_at?: string | null
          name?: string
          resource?: Json
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          emergency_contact: string | null
          id: string
          logo_url: string | null
          opening_hours: Json
          organization_id: string
          organization_type: string
          phone: string | null
          services_offered: string[]
          updated_at: string
          verification_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          emergency_contact?: string | null
          id?: string
          logo_url?: string | null
          opening_hours?: Json
          organization_id: string
          organization_type?: string
          phone?: string | null
          services_offered?: string[]
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          emergency_contact?: string | null
          id?: string
          logo_url?: string | null
          opening_hours?: Json
          organization_id?: string
          organization_type?: string
          phone?: string | null
          services_offered?: string[]
          updated_at?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "provider_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          active: boolean
          address: string | null
          attributes: Json
          created_at: string
          deleted_at: string | null
          distance_km: number | null
          email: string | null
          external_id: string | null
          healthcare_service_ids: Json
          id: string
          last_ingested_at: string | null
          latitude: number | null
          location_id: string | null
          longitude: number | null
          name: string
          organization_id: string | null
          phone: string | null
          source: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          attributes?: Json
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          email?: string | null
          external_id?: string | null
          healthcare_service_ids?: Json
          id: string
          last_ingested_at?: string | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          phone?: string | null
          source?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          attributes?: Json
          created_at?: string
          deleted_at?: string | null
          distance_km?: number | null
          email?: string | null
          external_id?: string | null
          healthcare_service_ids?: Json
          id?: string
          last_ingested_at?: string | null
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          source?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          notifications_enabled: boolean
          subscribed_category_ids: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          notifications_enabled?: boolean
          subscribed_category_ids?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          subscribed_category_ids?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_prices: {
        Row: {
          amount_minor: number
          billing_interval: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          paystack_plan_code: string | null
          plan_type: string
          provider: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          billing_interval: string
          created_at?: string
          currency: string
          id: string
          is_active?: boolean
          paystack_plan_code?: string | null
          plan_type: string
          provider: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          paystack_plan_code?: string | null
          plan_type?: string
          provider?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          household_id: string | null
          id: string
          payment_id: string | null
          plan_type: string
          provider: string
          provider_customer_id: string | null
          provider_ref: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval: string
          created_at?: string
          currency: string
          current_period_end?: string | null
          current_period_start?: string | null
          household_id?: string | null
          id: string
          payment_id?: string | null
          plan_type: string
          provider: string
          provider_customer_id?: string | null
          provider_ref?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          household_id?: string | null
          id?: string
          payment_id?: string | null
          plan_type?: string
          provider?: string
          provider_customer_id?: string | null
          provider_ref?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "family_households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_location_samples: {
        Row: {
          accuracy: number | null
          altitude: number | null
          altitude_accuracy: number | null
          captured_at: string
          created_at: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          mocked: boolean | null
          source: string
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          altitude_accuracy?: number | null
          captured_at: string
          created_at?: string
          heading?: number | null
          id: string
          latitude: number
          longitude: number
          mocked?: boolean | null
          source?: string
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          altitude_accuracy?: number | null
          captured_at?: string
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          mocked?: boolean | null
          source?: string
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      community_leaderboard_points: {
        Row: {
          chapter_id: string | null
          country_code: string | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_chapters_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "community_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "community_contributions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "community_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_direct_message: {
        Args: { p_org_id: string; p_user_a: string; p_user_b: string }
        Returns: boolean
      }
      can_edit_catalog: { Args: never; Returns: boolean }
      can_manage_community_chapter: {
        Args: { p_chapter_id: string }
        Returns: boolean
      }
      can_manage_provider_org: { Args: { p_org_id: string }; Returns: boolean }
      can_read_message_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      can_write_provider_org: { Args: { p_org_id: string }; Returns: boolean }
      cancel_family_connection_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          from_user_id: string
          household_id: string
          id: string
          invite_token: string | null
          status: string
          to_email: string | null
          to_phone: string | null
          to_user_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "family_connection_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      community_chapter_role: {
        Args: { p_chapter_id: string }
        Returns: string
      }
      create_family_connection_request: {
        Args: {
          p_household_id: string
          p_invite_token?: string
          p_to_email?: string
          p_to_phone?: string
          p_to_user_id?: string
        }
        Returns: {
          created_at: string
          from_user_id: string
          household_id: string
          id: string
          invite_token: string | null
          status: string
          to_email: string | null
          to_phone: string | null
          to_user_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "family_connection_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_provider_catalog_stub: {
        Args: {
          p_address?: string
          p_attributes?: Json
          p_distance_km?: number
          p_email?: string
          p_id: string
          p_latitude?: number
          p_longitude?: number
          p_name: string
          p_phone?: string
          p_type: string
          p_updated_at?: string
        }
        Returns: undefined
      }
      family_adult_invite_seats_used: {
        Args: { p_household_id: string }
        Returns: number
      }
      get_emergency_by_share_token: { Args: { p_token: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_community_leader: { Args: { p_chapter_id: string }; Returns: boolean }
      is_community_member: { Args: { p_chapter_id: string }; Returns: boolean }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      is_linked_to_org: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_message_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_org_practitioner: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_provider_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_provider_org_verified: { Args: { p_org_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
      lookup_user_for_family_connect: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          country_code: string
          date_of_birth: string
          email: string
          full_name: string
          phone: string
          state: string
          user_id: string
        }[]
      }
      mark_connected_patient_as_staff: {
        Args: {
          p_company_email?: string
          p_company_phone?: string
          p_display_name?: string
          p_organization_id: string
          p_patient_user_id: string
          p_position?: string
        }
        Returns: {
          company_email: string | null
          company_phone: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          organization_id: string
          position: string | null
          role: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "provider_org_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      nearby_providers: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
          p_search?: string
          p_type?: string
        }
        Returns: {
          active: boolean
          address: string
          attributes: Json
          created_at: string
          deleted_at: string
          distance_km: number
          email: string
          external_id: string
          healthcare_service_ids: Json
          id: string
          last_ingested_at: string
          latitude: number
          location_id: string
          longitude: number
          name: string
          organization_id: string
          phone: string
          source: string
          type: string
          updated_at: string
        }[]
      }
      post_org_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          sender_organization_id: string | null
          sender_party_type: string
          sender_user_id: string | null
          subject: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_patient_message: {
        Args: { p_body: string; p_conversation_id: string }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          sender_organization_id: string | null
          sender_party_type: string
          sender_user_id: string | null
          subject: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      provider_document_path_org_id: {
        Args: { object_name: string }
        Returns: string
      }
      provider_org_role: { Args: { p_org_id: string }; Returns: string }
      prune_user_location_samples: {
        Args: { p_user_id?: string }
        Returns: number
      }
      remove_family_adult_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      rebuild_provider_projection_for_location: {
        Args: { p_location_id: string }
        Returns: undefined
      }
      request_patient_provider_connection: {
        Args: { p_organization_id: string; p_patient_note?: string }
        Returns: {
          approved_at: string | null
          created_at: string
          id: string
          initiated_by: string
          organization_id: string
          patient_id: string
          patient_note: string | null
          provider_note: string | null
          rejected_at: string | null
          rejection_reason: string | null
          shared_scopes: string[]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patient_provider_connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_provider_connection_by_caremate_id: {
        Args: {
          p_caremate_id: string
          p_organization_id: string
          p_provider_note?: string
        }
        Returns: {
          approved_at: string | null
          created_at: string
          id: string
          initiated_by: string
          organization_id: string
          patient_id: string
          patient_note: string | null
          provider_note: string | null
          rejected_at: string | null
          rejection_reason: string | null
          shared_scopes: string[]
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "patient_provider_connections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_family_connection_request: {
        Args: {
          p_accept: boolean
          p_request_id: string
          p_self_full_name?: string
        }
        Returns: {
          created_at: string
          from_user_id: string
          household_id: string
          id: string
          invite_token: string | null
          status: string
          to_email: string | null
          to_phone: string | null
          to_user_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "family_connection_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_messageable_users: {
        Args: { p_limit?: number; p_organization_id?: string; p_query: string }
        Returns: {
          full_name: string
          is_practitioner: boolean
          organization_id: string
          organization_name: string
          patient_id: string
          user_id: string
        }[]
      }
      search_providers_by_name: {
        Args: { p_limit?: number; p_search: string; p_type?: string }
        Returns: {
          active: boolean
          address: string
          attributes: Json
          created_at: string
          deleted_at: string
          distance_km: number
          email: string
          external_id: string
          healthcare_service_ids: Json
          id: string
          last_ingested_at: string
          latitude: number
          location_id: string
          longitude: number
          name: string
          organization_id: string
          phone: string
          source: string
          type: string
          updated_at: string
        }[]
      }
      send_provider_org_message: {
        Args: {
          p_audience?: string
          p_body: string
          p_expires_at?: string
          p_organization_id: string
          p_patient_ids?: string[]
          p_subject?: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_direct_conversation: {
        Args: {
          p_body?: string
          p_organization_id: string
          p_other_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

export type Article = Database['public']['Tables']['articles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ProviderOrganization = Database['public']['Tables']['provider_organizations']['Row'];
export type ProviderLocation = Database['public']['Tables']['provider_locations']['Row'];
export type ProviderHealthcareService =
  Database['public']['Tables']['provider_healthcare_services']['Row'];
export type ProviderProfile = Database['public']['Tables']['provider_profiles']['Row'];
export type HealthTip = Database['public']['Tables']['health_tips']['Row'];
export type AdRemoteConfig = Database['public']['Tables']['ad_remote_config']['Row'];
export type AdCampaign = Database['public']['Tables']['ad_campaigns']['Row'];
export type AdAdvertiser = Database['public']['Tables']['ad_advertisers']['Row'];
export type AdCreative = Database['public']['Tables']['ad_creatives']['Row'];
export type AdPlacement = Database['public']['Tables']['ad_placements']['Row'];
export type AdEvent = Database['public']['Tables']['ad_events']['Row'];
export type UserLocationSample = Database['public']['Tables']['user_location_samples']['Row'];
export type NotificationDevice = Database['public']['Tables']['notification_devices']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type EmergencyProfile = Database['public']['Tables']['emergency_profiles']['Row'];
export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type ArticleRead = Database['public']['Tables']['article_reads']['Row'];
export type MiniAppSnapshot = Database['public']['Tables']['mini_app_snapshots']['Row'];
export type SubscriptionPrice = Database['public']['Tables']['subscription_prices']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type AdminAuditEvent = Database['public']['Tables']['admin_audit_events']['Row'];
