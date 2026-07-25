-- Health Data Gateway: per-user encryption keys + PHI cutover markers.
-- Schema lives only in this root supabase/ project (no Nest-local supabase folder).
--
-- Emergency PHI stays jsonb so legacy mobile sync (plaintext arrays) keeps working
-- until cutover. The gateway stores ciphertext as jsonb JSON strings ("v1:…").

-- ========== user_encryption_keys (service-role only) ==========
create table if not exists public.user_encryption_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wrapped_dek text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_encryption_keys enable row level security;

-- No end-user policies: only the gateway service role may read/write keys.
revoke all on table public.user_encryption_keys from anon, authenticated;
grant all on table public.user_encryption_keys to service_role;

-- ========== cutover markers ==========
alter table public.profiles
  add column if not exists phi_encrypted_at timestamptz;

alter table public.emergency_profiles
  add column if not exists phi_encrypted_at timestamptz;

comment on table public.user_encryption_keys is
  'Wrapped per-user data encryption keys managed by the Health Data Gateway.';
comment on column public.profiles.phi_encrypted_at is
  'Set when the Health Data Gateway last wrote encrypted PHI fields.';
comment on column public.emergency_profiles.phi_encrypted_at is
  'Set when the Health Data Gateway last wrote encrypted PHI fields.';
