import type { LearnContentType } from '@/domains/articles/content-types';
import type { ProviderType } from '@/domains/providers/types';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  deletedAt: string | null;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Profile extends BaseEntity {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  state: string | null;
  /** CareMate Patient ID — 12 digits, minted on demand (not at signup). */
  patientId: string | null;
}

export interface EmergencyProfile extends BaseEntity {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string[];
  currentMedications: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContact[];
  preferredHospital: string | null;
  insuranceProvider: string | null;
  notes: string | null;
}

export type { ProviderAttributes, ProviderType } from '@/domains/providers/types';

export interface Provider extends BaseEntity {
  name: string;
  type: ProviderType;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  isFavorite: boolean;
  distanceKm: number | null;
  /** Type-specific flexible fields (JSON). Prefer keys documented in domains/providers/types.ts */
  attributes: Record<string, unknown>;
}

export type { LearnContentAttributes, LearnContentType } from '@/domains/articles/content-types';

export interface Article extends BaseEntity {
  title: string;
  summary: string | null;
  content: string;
  /** Format discriminant — Phase 1 always `article`; see learn-content-model.md */
  contentType: LearnContentType;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  /** Kind-specific fields (video URL, alert severity, guide steps, …) */
  attributes: Record<string, unknown>;
}

export interface Bookmark extends BaseEntity {
  articleId: string;
  userId: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  isSubscribed: boolean;
}

export interface AppSettings extends BaseEntity {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  subscribedCategoryIds: string[];
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncMetadata {
  key: string;
  value: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
}
