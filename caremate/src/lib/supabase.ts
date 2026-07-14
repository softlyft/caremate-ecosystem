import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@caremate/db-types';

import { config } from '@/constants/env';
import { authStorage } from '@/lib/storage';

/** Typed Supabase client — cloud table/RPC payloads follow `@caremate/db-types`. */
export const supabase = createClient<Database>(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
