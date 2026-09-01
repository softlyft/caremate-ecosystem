const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function supabaseRestHeaders(): HeadersInit {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
}

export function supabaseRestUrl(table: string, query: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/rest/v1/${table}?${query}`;
}
