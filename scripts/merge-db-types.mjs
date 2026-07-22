#!/usr/bin/env node
/**
 * After `supabase gen types`, merge aliases CareMate apps expect
 * onto packages/db-types/src/database.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const genPath = path.join(root, 'packages/db-types/src/database.gen.ts');
const outPath = path.join(root, 'packages/db-types/src/database.ts');

execSync(`supabase gen types typescript --linked > "${genPath}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (!fs.existsSync(genPath)) {
  console.error('Missing database.gen.ts — supabase gen types failed');
  process.exit(1);
}

const generated = fs.readFileSync(genPath, 'utf8');
const aliases = `
export type Article = Database['public']['Tables']['articles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type ProviderOrganization = Database['public']['Tables']['provider_organizations']['Row'];
export type ProviderLocation = Database['public']['Tables']['provider_locations']['Row'];
export type ProviderHealthcareService =
  Database['public']['Tables']['provider_healthcare_services']['Row'];
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
`;

fs.writeFileSync(outPath, `${generated.trim()}\n${aliases}`);
fs.unlinkSync(genPath);
console.log('Wrote packages/db-types/src/database.ts');
