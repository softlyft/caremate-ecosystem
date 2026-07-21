/**
 * Local types for Community Portal tables until `@caremate/db-types` is regenerated
 * after migration `20260721100000_community_portal_phase1.sql`.
 */
import type { Database as BaseDatabase, Json, Profile } from '@caremate/db-types';

export type { Json, Profile };

export type ContributorCategory =
  | 'community_champion'
  | 'health_contributor'
  | 'builder_network'
  | 'partner_champion';

export type ChapterType =
  | 'campus'
  | 'city'
  | 'community'
  | 'organization'
  | 'healthcare_partner';

export type MembershipRole = 'member' | 'lead' | 'deputy';

export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export type ChapterStatus = 'pending' | 'active' | 'archived';

export type ChapterRequestStatus = 'pending' | 'approved' | 'rejected';

export type EventRegistrationStatus = 'registered' | 'cancelled' | 'attended' | 'no_show';

export type AnnouncementReaction = 'like' | 'celebrate' | 'support';

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type CommunityProfile = {
  user_id: string;
  photo_url: string | null;
  full_name: string;
  phone: string | null;
  bio: string | null;
  profession: string | null;
  interests: string[];
  skills: string[];
  country_code: string | null;
  state_id: string | null;
  city_id: string | null;
  contributor_category: ContributorCategory | null;
  onboarding_completed_at: string | null;
} & Timestamps;

export type CommunityChapter = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  chapter_type: ChapterType;
  country_code: string;
  administrative_hierarchy: Record<string, string>;
  state_id: string | null;
  city_id: string | null;
  lead_user_id: string | null;
  deputy_user_id: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  member_count: number;
  achievements: Json;
  status: ChapterStatus;
} & Timestamps;

export type CommunityChapterRequest = {
  id: string;
  requested_by: string;
  name: string;
  description: string | null;
  chapter_type: ChapterType;
  country_code: string;
  administrative_hierarchy: Record<string, string>;
  state_id: string | null;
  city_id: string | null;
  status: ChapterRequestStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_chapter_id: string | null;
} & Timestamps;

export type CommunityMembership = {
  id: string;
  user_id: string;
  chapter_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
} & Timestamps;

export type CommunityEvent = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  registration_deadline: string | null;
  banner_url: string | null;
  registration_open: boolean;
  created_by: string | null;
} & Timestamps;

export type CommunityEventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  status: EventRegistrationStatus;
  registered_at: string;
  attended_at: string | null;
};

export type CommunityAnnouncement = {
  id: string;
  chapter_id: string;
  title: string;
  body: string;
  published_by: string | null;
  published_at: string;
} & Timestamps;

export type CommunityResource = {
  id: string;
  chapter_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  is_global: boolean;
  uploaded_by: string | null;
} & Timestamps;

export type CommunityBadge = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  points_value: number;
  is_active: boolean;
  created_at: string;
};

export type CommunityCertificate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  template_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type CommunityContribution = {
  id: string;
  user_id: string;
  chapter_id: string | null;
  action_type: string;
  description: string | null;
  points: number;
  metadata: Json;
  recorded_by: string | null;
  created_at: string;
};

export type CommunityNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

export type CommunityGalleryItem = {
  id: string;
  chapter_id: string;
  image_url: string;
  caption: string | null;
  event_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

// Kept as a schema reference for the portal's exported domain aliases below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CommunityTables = {
  community_profiles: {
    Row: CommunityProfile;
    Insert: {
      user_id: string;
      photo_url?: string | null;
      full_name: string;
      phone?: string | null;
      bio?: string | null;
      profession?: string | null;
      interests?: string[];
      skills?: string[];
      country_code?: string | null;
      state_id?: string | null;
      city_id?: string | null;
      contributor_category?: ContributorCategory | null;
      onboarding_completed_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_profiles']['Insert']>;
    Relationships: [];
  };
  community_chapters: {
    Row: CommunityChapter;
    Insert: {
      id?: string;
      name: string;
      slug: string;
      description?: string | null;
      chapter_type?: ChapterType;
      country_code: string;
      administrative_hierarchy?: Json;
      state_id?: string | null;
      city_id?: string | null;
      lead_user_id?: string | null;
      deputy_user_id?: string | null;
      cover_image_url?: string | null;
      logo_url?: string | null;
      member_count?: number;
      achievements?: Json;
      status?: ChapterStatus;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_chapters']['Insert']>;
    Relationships: [];
  };
  community_chapter_requests: {
    Row: CommunityChapterRequest;
    Insert: {
      id?: string;
      requested_by: string;
      name: string;
      description?: string | null;
      chapter_type?: ChapterType;
      country_code: string;
      administrative_hierarchy?: Json;
      state_id?: string | null;
      city_id?: string | null;
      status?: ChapterRequestStatus;
      review_note?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      created_chapter_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_chapter_requests']['Insert']>;
    Relationships: [];
  };
  community_memberships: {
    Row: CommunityMembership;
    Insert: {
      id?: string;
      user_id: string;
      chapter_id: string;
      role?: MembershipRole;
      status?: MembershipStatus;
      review_note?: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_memberships']['Insert']>;
    Relationships: [];
  };
  community_events: {
    Row: CommunityEvent;
    Insert: {
      id?: string;
      chapter_id: string;
      title: string;
      description?: string | null;
      location?: string | null;
      starts_at: string;
      ends_at?: string | null;
      capacity?: number | null;
      registration_deadline?: string | null;
      banner_url?: string | null;
      registration_open?: boolean;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_events']['Insert']>;
    Relationships: [];
  };
  community_event_registrations: {
    Row: CommunityEventRegistration;
    Insert: {
      id?: string;
      event_id: string;
      user_id: string;
      status?: EventRegistrationStatus;
      registered_at?: string;
      attended_at?: string | null;
    };
    Update: Partial<CommunityTables['community_event_registrations']['Insert']>;
    Relationships: [];
  };
  community_announcements: {
    Row: CommunityAnnouncement;
    Insert: {
      id?: string;
      chapter_id: string;
      title: string;
      body: string;
      published_by?: string | null;
      published_at?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_announcements']['Insert']>;
    Relationships: [];
  };
  community_announcement_reactions: {
    Row: {
      announcement_id: string;
      user_id: string;
      reaction: AnnouncementReaction;
      created_at: string;
    };
    Insert: {
      announcement_id: string;
      user_id: string;
      reaction?: AnnouncementReaction;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_announcement_reactions']['Insert']>;
    Relationships: [];
  };
  community_announcement_bookmarks: {
    Row: {
      announcement_id: string;
      user_id: string;
      created_at: string;
    };
    Insert: {
      announcement_id: string;
      user_id: string;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_announcement_bookmarks']['Insert']>;
    Relationships: [];
  };
  community_resources: {
    Row: CommunityResource;
    Insert: {
      id?: string;
      chapter_id?: string | null;
      title: string;
      description?: string | null;
      tags?: string[];
      storage_path: string;
      mime_type?: string | null;
      file_size_bytes?: number | null;
      is_global?: boolean;
      uploaded_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<CommunityTables['community_resources']['Insert']>;
    Relationships: [];
  };
  community_badges: {
    Row: CommunityBadge;
    Insert: {
      id?: string;
      slug: string;
      name: string;
      description?: string | null;
      icon_url?: string | null;
      points_value?: number;
      is_active?: boolean;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_badges']['Insert']>;
    Relationships: [];
  };
  community_certificates: {
    Row: CommunityCertificate;
    Insert: {
      id?: string;
      slug: string;
      name: string;
      description?: string | null;
      template_url?: string | null;
      is_active?: boolean;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_certificates']['Insert']>;
    Relationships: [];
  };
  community_user_badges: {
    Row: {
      id: string;
      user_id: string;
      badge_id: string;
      awarded_by: string | null;
      awarded_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      badge_id: string;
      awarded_by?: string | null;
      awarded_at?: string;
    };
    Update: Partial<CommunityTables['community_user_badges']['Insert']>;
    Relationships: [];
  };
  community_user_certificates: {
    Row: {
      id: string;
      user_id: string;
      certificate_id: string;
      certificate_url: string | null;
      awarded_by: string | null;
      awarded_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      certificate_id: string;
      certificate_url?: string | null;
      awarded_by?: string | null;
      awarded_at?: string;
    };
    Update: Partial<CommunityTables['community_user_certificates']['Insert']>;
    Relationships: [];
  };
  community_contributions: {
    Row: CommunityContribution;
    Insert: {
      id?: string;
      user_id: string;
      chapter_id?: string | null;
      action_type: string;
      description?: string | null;
      points?: number;
      metadata?: Json;
      recorded_by?: string | null;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_contributions']['Insert']>;
    Relationships: [];
  };
  community_gallery_items: {
    Row: CommunityGalleryItem;
    Insert: {
      id?: string;
      chapter_id: string;
      image_url: string;
      caption?: string | null;
      event_id?: string | null;
      uploaded_by?: string | null;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_gallery_items']['Insert']>;
    Relationships: [];
  };
  community_notifications: {
    Row: CommunityNotification;
    Insert: {
      id?: string;
      user_id: string;
      type: string;
      title: string;
      body?: string | null;
      link_path?: string | null;
      read_at?: string | null;
      created_at?: string;
    };
    Update: Partial<CommunityTables['community_notifications']['Insert']>;
    Relationships: [];
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CommunityViews = {
  community_leaderboard_points: {
    Row: {
      user_id: string | null;
      chapter_id: string | null;
      country_code: string | null;
      total_points: number | null;
    };
    Relationships: [];
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CommunityFunctions = {
  is_community_member: {
    Args: { p_chapter_id: string };
    Returns: boolean;
  };
  community_chapter_role: {
    Args: { p_chapter_id: string };
    Returns: string;
  };
  is_community_leader: {
    Args: { p_chapter_id: string };
    Returns: boolean;
  };
  can_manage_community_chapter: {
    Args: { p_chapter_id: string };
    Returns: boolean;
  };
};

export type Database = BaseDatabase;
