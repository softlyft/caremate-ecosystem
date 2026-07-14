import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { config } from '@/constants/env';
import { authStorage } from '@/lib/storage';

export const supabase = createClient(
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
