import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const syncColumns = {
  syncStatus: text('sync_status').notNull().default('pending'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  avatarUrl: text('avatar_url'),
  countryCode: text('country_code'),
  languageCode: text('language_code'),
  state: text('state'),
  patientId: text('patient_id'),
  ...syncColumns,
});

export const emergencyProfiles = sqliteTable('emergency_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  fullName: text('full_name').notNull(),
  photoUrl: text('photo_url'),
  bloodGroup: text('blood_group'),
  genotype: text('genotype'),
  allergies: text('allergies').notNull().default('[]'),
  currentMedications: text('current_medications').notNull().default('[]'),
  chronicConditions: text('chronic_conditions').notNull().default('[]'),
  emergencyContacts: text('emergency_contacts').notNull().default('[]'),
  preferredHospital: text('preferred_hospital'),
  insuranceProvider: text('insurance_provider'),
  notes: text('notes'),
  ...syncColumns,
});

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  distanceKm: real('distance_km'),
  attributes: text('attributes').notNull().default('{}'),
  ...syncColumns,
});

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content').notNull(),
  contentType: text('content_type').notNull().default('article'),
  categoryId: text('category_id').notNull(),
  categoryName: text('category_name').notNull(),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  publishedAt: text('published_at'),
  attributes: text('attributes').notNull().default('{}'),
  ...syncColumns,
});

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull(),
  userId: text('user_id').notNull(),
  ...syncColumns,
});

export const healthTips = sqliteTable('health_tips', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull(),
  body: text('body').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...syncColumns,
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  theme: text('theme').notNull().default('system'),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  subscribedCategoryIds: text('subscribed_category_ids').notNull().default('[]'),
  ...syncColumns,
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const syncMetadata = sqliteTable('sync_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Full Zustand persist payloads for each mini-app, synced to Supabase as JSON. */
export const miniAppSnapshots = sqliteTable('mini_app_snapshots', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  appKey: text('app_key').notNull(),
  payload: text('payload').notNull().default('{}'),
  ...syncColumns,
});

/** Shared family unit. Personal profiles/settings stay per auth user. */
export const familyHouseholds = sqliteTable('family_households', {
  id: text('id').primaryKey(),
  createdByUserId: text('created_by_user_id').notNull(),
  name: text('name'),
  ...syncColumns,
});

/**
 * People in a household. Kids are local-only members (no linked_user_id).
 * Spouse/self have linkedUserId when connected to a CareMate account.
 */
export const familyMembers = sqliteTable('family_members', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  kind: text('kind').notNull(),
  linkedUserId: text('linked_user_id'),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  notes: text('notes'),
  ...syncColumns,
});

export const familyConnectionRequests = sqliteTable('family_connection_requests', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id'),
  toEmail: text('to_email'),
  toPhone: text('to_phone'),
  status: text('status').notNull().default('pending'),
  inviteToken: text('invite_token'),
  ...syncColumns,
});

/** Pull-only cache of cloud Premium entitlement for offline badge/UI. */
export const subscriptionEntitlements = sqliteTable('subscription_entitlements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  householdId: text('household_id'),
  planType: text('plan_type').notNull(),
  billingInterval: text('billing_interval').notNull(),
  currency: text('currency').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: text('current_period_end'),
  ...syncColumns,
});

/**
 * In-app notification inbox (title + body cards).
 * Local-first; cloud sync / push / email fan-out come later.
 */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  domain: text('domain').notNull(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  severity: text('severity').notNull().default('info'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  dataJson: text('data_json').notNull().default('{}'),
  dedupeKey: text('dedupe_key'),
  readAt: text('read_at'),
  ...syncColumns,
});

export const schema = {
  profiles,
  emergencyProfiles,
  providers,
  articles,
  bookmarks,
  healthTips,
  settings,
  syncQueue,
  syncMetadata,
  miniAppSnapshots,
  familyHouseholds,
  familyMembers,
  familyConnectionRequests,
  subscriptionEntitlements,
  notifications,
};
