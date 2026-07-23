import Constants from 'expo-constants';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const paymentUrl = process.env.EXPO_PUBLIC_PAYMENT_URL ?? '';
const websiteUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_WEBSITE_URL?.trim() || 'https://getcaremate.com',
);
const communityPortalUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_COMMUNITY_PORTAL_URL?.trim() || 'https://community.getcaremate.com',
);
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const appEnv =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
  process.env.APP_ENV?.trim() ||
  (__DEV__ ? 'development' : 'production');

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  paymentUrl,
  websiteUrl,
  communityPortalUrl,
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  appEnv,
  sentryDsn,
  isSentryConfigured: Boolean(sentryDsn.trim()),
  /** When true, send Sentry events from __DEV__ builds (default off). */
  sentryEnableInDev: process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV === '1',
  posthogApiKey,
  posthogHost,
  isPostHogConfigured: Boolean(posthogApiKey.trim()),
  /** When true, send PostHog events from __DEV__ builds (default off). */
  posthogEnableInDev: process.env.EXPO_PUBLIC_POSTHOG_ENABLE_IN_DEV === '1',
  admobAppIdAndroid: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? '',
  admobAppIdIos: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? '',
  admobBannerHomeTips: process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_TIPS ?? '',
  admobBannerHomeFeed: process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_FEED ?? '',
  admobBannerLearnList: process.env.EXPO_PUBLIC_ADMOB_BANNER_LEARN_LIST ?? '',
  admobBannerLearnArticleHeader: process.env.EXPO_PUBLIC_ADMOB_BANNER_LEARN_ARTICLE_HEADER ?? '',
  admobBannerLearnArticleFooter: process.env.EXPO_PUBLIC_ADMOB_BANNER_LEARN_ARTICLE_FOOTER ?? '',
  admobBannerNearbyList: process.env.EXPO_PUBLIC_ADMOB_BANNER_NEARBY_LIST ?? '',
  admobBannerNearbyProvider: process.env.EXPO_PUBLIC_ADMOB_BANNER_NEARBY_PROVIDER ?? '',
  admobBannerPregnancyTimeline: process.env.EXPO_PUBLIC_ADMOB_BANNER_PREGNANCY_TIMELINE ?? '',
  admobBannerPregnancyFooter: process.env.EXPO_PUBLIC_ADMOB_BANNER_PREGNANCY_FOOTER ?? '',
  admobBannerPeriodWeek: process.env.EXPO_PUBLIC_ADMOB_BANNER_PERIOD_WEEK ?? '',
  admobBannerPeriodFooter: process.env.EXPO_PUBLIC_ADMOB_BANNER_PERIOD_FOOTER ?? '',
  isAdMobConfigured: Boolean(
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID && process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
  ),
} as const;
