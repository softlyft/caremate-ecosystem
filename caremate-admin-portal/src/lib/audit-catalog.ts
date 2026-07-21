/**
 * Canonical audit action / entity strings for portal mutations.
 * Prefer these over free-form strings when writing events.
 */

export const AUDIT_ENTITY = {
  article: 'article',
  healthTip: 'health_tip',
  media: 'media',
  provider: 'provider',
  providerIngest: 'provider_ingest',
  adRemoteConfig: 'ads_remote_config',
  adAdvertiser: 'ad_advertiser',
  adCampaign: 'ad_campaign',
  subscriptionPrice: 'subscription_price',
  subscription: 'subscription',
  user: 'user',
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

/** Known create / update / delete (+ privileged) actions written today. */
export const AUDIT_ACTION = {
  createArticle: 'create_article',
  updateArticle: 'update_article',
  deleteArticle: 'delete_article',

  createTip: 'create_tip',
  updateTip: 'update_tip',
  deleteTip: 'delete_tip',

  uploadMedia: 'upload_media',

  ingestProvider: 'ingest_provider',
  archiveProvider: 'archive_provider',

  updateAdsRemoteConfig: 'update_ads_remote_config',
  createAdAdvertiser: 'create_ad_advertiser',
  updateAdAdvertiser: 'update_ad_advertiser',
  verifyAdAdvertiser: 'verify_ad_advertiser',
  rejectAdAdvertiser: 'reject_ad_advertiser',
  createAdCampaign: 'create_ad_campaign',
  updateAdCampaign: 'update_ad_campaign',
  deleteAdCampaign: 'delete_ad_campaign',
  createHouseCampaign: 'create_house_campaign',
  updateHouseCampaign: 'update_house_campaign',
  deleteHouseCampaign: 'delete_house_campaign',
  createSponsoredCampaign: 'create_sponsored_campaign',
  updateSponsoredCampaign: 'update_sponsored_campaign',
  deleteSponsoredCampaign: 'delete_sponsored_campaign',

  updateSubscriptionPrice: 'update_subscription_price',
  adminActivateSubscription: 'admin_activate_subscription',
  adminUpgradeToFamily: 'admin_upgrade_to_family',

  banUser: 'ban_user',
  unbanUser: 'unban_user',
  passwordReset: 'password_reset',
  setRole: 'set_role',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION] | string;

export function auditOperationKind(
  action: string,
): 'create' | 'update' | 'delete' | 'other' {
  if (
    action.startsWith('create_') ||
    action.startsWith('admin_activate') ||
    action.startsWith('ingest_') ||
    action.startsWith('upload_')
  ) {
    return 'create';
  }
  if (
    action.startsWith('update_') ||
    action.startsWith('set_') ||
    action.startsWith('verify_') ||
    action.startsWith('unban_') ||
    action.startsWith('admin_upgrade') ||
    action === 'password_reset'
  ) {
    return 'update';
  }
  if (
    action.startsWith('delete_') ||
    action.startsWith('archive_') ||
    action.startsWith('ban_') ||
    action.startsWith('reject_')
  ) {
    return 'delete';
  }
  return 'other';
}

export function formatAuditAction(action: string): string {
  return action.replace(/_/g, ' ');
}
