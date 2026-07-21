/** Allowed ad slot ids (hard-coded in mobile; portal sets source per slot). */
export const AD_SLOTS = {
  HOME_TIPS: 'home.tips',
  HOME_FEED: 'home.feed',
  LEARN_LIST: 'learn.list',
  LEARN_ARTICLE_HEADER: 'learn.article_header',
  LEARN_ARTICLE_FOOTER: 'learn.article_footer',
  NEARBY_LIST: 'nearby.list',
  NEARBY_PROVIDER: 'nearby.provider',
  PREGNANCY_TIMELINE: 'pregnancy.timeline',
  PREGNANCY_FOOTER: 'pregnancy.footer',
  PERIOD_WEEK: 'period.week',
  PERIOD_FOOTER: 'period.footer',
} as const;

export type AdSlotId = (typeof AD_SLOTS)[keyof typeof AD_SLOTS];

export const AD_SLOT_IDS: AdSlotId[] = Object.values(AD_SLOTS);

export type AdSlotMode = 'off' | 'house' | 'sponsored' | 'admob';

export type AdSource = 'house' | 'sponsored' | 'admob';

export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'archived';

export type AdvertiserOrgType =
  'hospital' | 'pharmacy' | 'laboratory' | 'ngo' | 'hmo' | 'public_health' | 'other';

export type AdvertiserVerificationStatus = 'pending' | 'verified' | 'rejected';

/** House or sponsored banner resolved from local catalog. */
export type ResolvedCatalogAd = {
  kind: 'catalog';
  source: 'house' | 'sponsored';
  campaignId: string;
  creativeId: string;
  slotId: AdSlotId;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  badgeLabel: string | null;
  advertiserName: string | null;
};

/** AdMob adaptive banner for a slot. */
export type ResolvedAdMobAd = {
  kind: 'admob';
  source: 'admob';
  slotId: AdSlotId;
  unitId: string;
};

export type ResolvedSlotAd = ResolvedCatalogAd | ResolvedAdMobAd;

export type AdsRemoteConfig = {
  adsEnabled: boolean;
  slotMode: Record<AdSlotId, AdSlotMode>;
};

export const DEFAULT_ADS_REMOTE_CONFIG: AdsRemoteConfig = {
  adsEnabled: true,
  slotMode: {
    'home.tips': 'house',
    'home.feed': 'house',
    'learn.list': 'house',
    'learn.article_header': 'house',
    'learn.article_footer': 'house',
    'nearby.list': 'house',
    'nearby.provider': 'house',
    'pregnancy.timeline': 'house',
    'pregnancy.footer': 'house',
    'period.week': 'house',
    'period.footer': 'house',
  },
};

/** @deprecated Use ResolvedCatalogAd — kept for event helpers during migration. */
export type ResolvedAd = ResolvedCatalogAd;
