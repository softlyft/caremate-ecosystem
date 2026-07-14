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
} as const;
