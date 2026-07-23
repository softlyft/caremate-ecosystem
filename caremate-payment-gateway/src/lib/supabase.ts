import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      // Short-lived checkout session — avoid lingering tokens in localStorage.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Apply mobile checkout handoff via single-use server code.
 * Legacy access_token/refresh_token-in-hash is intentionally unsupported.
 */
export async function hydrateSessionFromHash(): Promise<Session | null> {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  const params = new URLSearchParams(hash);
  const handoff = params.get('handoff');

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  if (!handoff) {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  const { data, error } = await supabase.functions.invoke('exchange-checkout-handoff', {
    body: { code: handoff },
  });
  if (error) {
    throw error;
  }
  const access_token = typeof data?.access_token === 'string' ? data.access_token : null;
  const refresh_token = typeof data?.refresh_token === 'string' ? data.refresh_token : null;
  if (!access_token || !refresh_token) {
    throw new Error('Invalid checkout handoff response');
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionError) {
    throw sessionError;
  }
  return sessionData.session;
}
