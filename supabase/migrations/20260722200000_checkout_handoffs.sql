-- Short-lived checkout session handoff (tokens never placed in browser URLs).

create table if not exists public.checkout_handoffs (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists checkout_handoffs_user_id_idx
  on public.checkout_handoffs (user_id);

create index if not exists checkout_handoffs_expires_at_idx
  on public.checkout_handoffs (expires_at);

alter table public.checkout_handoffs enable row level security;

-- No direct client access; Edge Functions use the service role.
revoke all on public.checkout_handoffs from anon, authenticated;
grant all on public.checkout_handoffs to service_role;
