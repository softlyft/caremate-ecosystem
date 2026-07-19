-- Provider Portal: organization claim challenges (email verification before first owner).
-- Codes are shown in the portal UI for MVP (no outbound email yet).

create table if not exists public.provider_org_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists provider_org_claims_email_idx
  on public.provider_org_claims (lower(email), created_at desc);

create index if not exists provider_org_claims_org_idx
  on public.provider_org_claims (organization_id, created_at desc);

alter table public.provider_org_claims enable row level security;

-- No direct client access — service role / server actions only.
revoke all on public.provider_org_claims from anon, authenticated;
grant all on public.provider_org_claims to service_role;
