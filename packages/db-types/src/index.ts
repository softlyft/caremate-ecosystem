/**
 * Shared Postgres types for CareMate apps.
 *
 * Regenerate from the live project (repo root):
 *   npm run db:types
 *
 * Keep in sync whenever you add supabase/migrations.
 */
export type {
  Json,
  Database,
  Article,
  Provider,
  ProviderOrganization,
  ProviderLocation,
  ProviderHealthcareService,
  HealthTip,
  AdRemoteConfig,
  AdCampaign,
  AdAdvertiser,
  AdCreative,
  AdPlacement,
  AdEvent,
  UserLocationSample,
  Profile,
  Settings,
  EmergencyProfile,
  Bookmark,
  ArticleRead,
  MiniAppSnapshot,
  SubscriptionPrice,
  Payment,
  Subscription,
  AdminAuditEvent,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database';
