import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@caremate/db-types';

import { config } from '@/constants/env';
import { authStorage } from '@/lib/storage';

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';

/**
 * Guest / offline builds may omit Supabase. Call sites must check
 * `config.isSupabaseConfigured` before using the client. Any ungated access
 * throws instead of talking to a fake `placeholder.supabase.co` host.
 */
export function createUnconfiguredSupabaseClient(): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop) {
      if (prop === 'then' || prop === 'toJSON' || prop === Symbol.toStringTag) {
        return undefined;
      }
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    },
  });
}

function createConfiguredSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** Typed Supabase client — cloud table/RPC payloads follow `@caremate/db-types`. */
export const supabase: SupabaseClient<Database> = config.isSupabaseConfigured
  ? createConfiguredSupabaseClient()
  : createUnconfiguredSupabaseClient();
