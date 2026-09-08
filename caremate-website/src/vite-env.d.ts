/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL: string;
  readonly VITE_COMMUNITY_PORTAL_URL: string;
  readonly VITE_PAYMENT_URL: string;
  readonly VITE_CARE_URL: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional GA4 / Google tag ID (`G-…` or `GT-…`). Empty skips analytics. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
