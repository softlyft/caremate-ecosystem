import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const currentsApiKey = process.env.EXPO_PUBLIC_CURRENTS_API_KEY ?? '';
const currentsCountry = process.env.EXPO_PUBLIC_CURRENTS_COUNTRY ?? 'INT';

export const config = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  currentsApiKey,
  isCurrentsConfigured: Boolean(currentsApiKey),
  currentsCountry,
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
  isAdMobConfigured: Boolean(
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID && process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
  ),
} as const;
