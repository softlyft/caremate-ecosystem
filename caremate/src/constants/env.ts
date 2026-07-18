import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const currentsApiKey = process.env.EXPO_PUBLIC_CURRENTS_API_KEY ?? '';
const currentsCountry = process.env.EXPO_PUBLIC_CURRENTS_COUNTRY ?? 'INT';
const paymentUrl = process.env.EXPO_PUBLIC_PAYMENT_URL ?? '';

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  currentsApiKey,
  isCurrentsConfigured: Boolean(currentsApiKey),
  currentsCountry,
  paymentUrl,
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
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
