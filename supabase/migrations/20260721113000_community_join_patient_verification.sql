-- Community enrollment is restricted to existing CareMate patient profiles.
-- Verification records are short-lived and only accessed through the service role.

create table if not exists public.community_join_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  session_token_hash text,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists community_join_verifications_user_idx
  on public.community_join_verifications (user_id, created_at desc);

create index if not exists community_join_verifications_expiry_idx
  on public.community_join_verifications (expires_at);

alter table public.community_join_verifications enable row level security;

comment on table public.community_join_verifications is
  'Short-lived verification state for enrolling an existing CareMate patient into a community chapter.';
