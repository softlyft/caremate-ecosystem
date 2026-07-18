export const APP_NAME = 'CareMate';

/** Public store listings for spouse invite share text (update when listings go live). */
export const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/app/caremate',
  android: 'https://play.google.com/store/apps/details?id=com.softlyft.caremate',
} as const;

export const STORAGE_KEYS = {
  onboardingComplete: 'caremate_onboarding_complete',
  biometricEnabled: 'caremate_biometric_enabled',
  deviceDefaults: 'caremate_device_defaults',
} as const;

export const SYNC_CONFIG = {
  maxRetries: 5,
  retryDelayMs: 2000,
  /** Safety-net interval while app is open (not the primary trigger). */
  pullIntervalMs: 60_000,
  /** Coalesce bursts of local writes into one push when online. */
  writeDebounceMs: 1_500,
} as const;

export const QUERY_KEYS = {
  profile: ['profile'] as const,
  emergencyProfile: ['emergency-profile'] as const,
  articles: ['articles'] as const,
  trendingArticles: ['trending-articles'] as const,
  articleCategories: ['article-categories'] as const,
  bookmarks: ['bookmarks'] as const,
  articleReads: ['article-reads'] as const,
  providers: ['providers'] as const,
  settings: ['settings'] as const,
  search: ['search'] as const,
  familyHousehold: ['family-household'] as const,
  familyMembers: ['family-members'] as const,
  familyRequests: ['family-requests'] as const,
  notifications: ['notifications'] as const,
  notificationsUnread: ['notifications', 'unread'] as const,
  ads: ['ads'] as const,
} as const;
