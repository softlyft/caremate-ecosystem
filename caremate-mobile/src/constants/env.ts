import Constants from 'expo-constants';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const paymentUrl = process.env.EXPO_PUBLIC_PAYMENT_URL ?? '';
const healthDataGatewayUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL?.trim() || '',
);
const websiteUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_WEBSITE_URL?.trim() || 'https://main.dim7uuolmjgc9.amplifyapp.com',
);
const communityPortalUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_COMMUNITY_PORTAL_URL?.trim() ||
    'https://main.d2tlpjx9a9kklb.amplifyapp.com',
);
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const appEnv =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
  process.env.APP_ENV?.trim() ||
  (__DEV__ ? 'development' : 'production');
const isProductionAppEnv = appEnv === 'production';
const admobAppIdAndroid = process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? '';
const admobAppIdIos = process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? '';

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  paymentUrl,
  /** Optional Health Data Gateway base URL (no trailing slash). Empty = plaintext Supabase only. */
  healthDataGatewayUrl,
  isHealthDataGatewayConfigured: Boolean(healthDataGatewayUrl),
  websiteUrl,
  communityPortalUrl,
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  appEnv,
  /** True only for `prod` branch / App Store / Play binaries (`EXPO_PUBLIC_APP_ENV=production`). */
  isProductionAppEnv,
  sentryDsn,
  isSentryConfigured: Boolean(sentryDsn.trim()),
  /** When true, send Sentry events from __DEV__ builds (default off). */
  sentryEnableInDev: process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV === '1',
  posthogApiKey,
  posthogHost,
  isPostHogConfigured: Boolean(posthogApiKey.trim()),
  /** When true, send PostHog events from __DEV__ builds (default off). */
  posthogEnableInDev: process.env.EXPO_PUBLIC_POSTHOG_ENABLE_IN_DEV === '1',
  admobAppIdAndroid,
  admobAppIdIos,
  /** iOS banner unit — one ID for every slot. Android uses the per-slot `EXPO_PUBLIC_ADMOB_BANNER_*` secrets. */
  admobBannerUnitIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_IOS ?? '',
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
  isAdMobConfigured: isProductionAppEnv ? Boolean(admobAppIdAndroid && admobAppIdIos) : true,
} as const;
