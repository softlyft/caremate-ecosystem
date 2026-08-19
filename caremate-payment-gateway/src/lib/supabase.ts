import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('Sign in failed');
  }
  return data.session;
}

/**
 * Apply mobile checkout handoff via single-use server code.
 * Legacy access_token/refresh_token-in-hash is intentionally unsupported.
 */
export async function hydrateSessionFromHash(): Promise<Session | null> {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);
  const handoff = hashParams.get('handoff') ?? queryParams.get('handoff');

  if (hash || queryParams.has('handoff')) {
    queryParams.delete('handoff');
    const search = queryParams.toString();
    const path = `${window.location.pathname}${search ? `?${search}` : ''}`;
    window.history.replaceState(null, '', path);
  }

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
