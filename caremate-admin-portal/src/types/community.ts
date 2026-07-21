/**
 * Community Portal table row types matching
 * `supabase/migrations/20260721100000_community_portal_phase1.sql`.
 * Local until `@caremate/db-types` is regenerated.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export type ChapterStatus = 'pending' | 'active' | 'archived';

export type ChapterRequestStatus = 'pending' | 'approved' | 'rejected';

export type MembershipRole = 'member' | 'lead' | 'deputy';

export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export type AdministrativeLevel = {
  key: string;
  label: string;
  short_label?: string;
  order: number;
  depends_on?: string;
};

/** Level-1 options are string[]; dependent levels map parent value → string[]. */
export type AdministrativeOptions = Record<string, string[] | Record<string, string[]>>;

export type CommunityCountry = {
  code: string;
  name: string;
  administrative_level_config: AdministrativeLevel[];
  administrative_options: AdministrativeOptions;
};

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type CommunityProfile = {
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  patient_id: string | null;
  avatar_url: string | null;
  country_code: string | null;
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

export type CommunityUserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_by: string | null;
  awarded_at: string;
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

export type CommunityStats = {
  profileCount: number;
  approvedMemberCount: number;
  activeChapterCount: number;
  pendingChapterRequestCount: number;
  eventCount: number;
  resourceCount: number;
  contributionCount: number;
  badgeCount: number;
  certificateCount: number;
};
