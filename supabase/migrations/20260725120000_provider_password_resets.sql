-- Provider Portal: password reset OTP challenges (email code, then set new password).

create table if not exists public.provider_password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists provider_password_resets_email_idx
  on public.provider_password_resets (lower(email), created_at desc);

create index if not exists provider_password_resets_user_idx
  on public.provider_password_resets (user_id, created_at desc);

create index if not exists provider_password_resets_expiry_idx
  on public.provider_password_resets (expires_at);

alter table public.provider_password_resets enable row level security;

comment on table public.provider_password_resets is
  'Provider portal password-reset OTP challenges. Service role only; codes never returned to clients.';

revoke all on public.provider_password_resets from anon, authenticated;
grant all on public.provider_password_resets to service_role;
