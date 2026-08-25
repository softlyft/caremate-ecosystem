-- Care Portal: payer organizations (catalog + claim/membership overlay).
-- Parallel to provider_organizations / provider_profiles / provider_org_members / claims.
-- SoftLyft seeds payer_organizations; orgs claim via Care Portal (org kind = payer).

-- ========== Catalog ==========
create table if not exists public.payer_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  website text,
  address text,
  active boolean not null default true,
  resource jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payer_organizations_name_uidx
  on public.payer_organizations (lower(name))
  where deleted_at is null;

create index if not exists payer_organizations_email_lower_idx
  on public.payer_organizations (lower(email))
  where deleted_at is null and email is not null;

comment on table public.payer_organizations is
  'Care network payer catalog (insurers / HMOs / payers). Contact email used for Care Portal claim.';

-- ========== Portal profile ==========
create table if not exists public.payer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique
    references public.payer_organizations (id) on delete cascade,
  description text,
  phone text,
  email text,
  website text,
  logo_url text,
  address text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payer_profiles_verification_idx
  on public.payer_profiles (verification_status);

-- ========== Membership / RBAC ==========
create table if not exists public.payer_org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner', 'administrator', 'staff', 'viewer')),
  display_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists payer_org_members_user_idx
  on public.payer_org_members (user_id)
  where deleted_at is null;

create index if not exists payer_org_members_org_idx
  on public.payer_org_members (organization_id)
  where deleted_at is null;

create unique index if not exists payer_org_members_one_active_owner_per_org_uidx
  on public.payer_org_members (organization_id)
  where deleted_at is null and role = 'owner';

comment on index public.payer_org_members_one_active_owner_per_org_uidx is
  'At most one active owner per payer org (blocks concurrent claim races).';

-- ========== Claim challenges ==========
create table if not exists public.payer_org_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists payer_org_claims_email_idx
  on public.payer_org_claims (lower(email), created_at desc);

create index if not exists payer_org_claims_org_idx
  on public.payer_org_claims (organization_id, created_at desc);

alter table public.payer_org_claims enable row level security;

revoke all on public.payer_org_claims from anon, authenticated;
grant all on public.payer_org_claims to service_role;

-- Allow payer_claim OTP kind on shared throttle table.
alter table public.provider_auth_otp_sends
  drop constraint if exists provider_auth_otp_sends_kind_check;

alter table public.provider_auth_otp_sends
  add constraint provider_auth_otp_sends_kind_check
  check (kind in ('claim', 'password_reset', 'payer_claim'));

comment on table public.provider_auth_otp_sends is
  'Throttle log for Care Portal claim / password-reset OTP emails (provider + payer). Service role only.';

-- ========== Helpers ==========
create or replace function public.is_payer_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payer_org_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
  );
$$;

create or replace function public.payer_org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.payer_org_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
    and m.deleted_at is null
  limit 1;
$$;

create or replace function public.can_manage_payer_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.payer_org_role(p_org_id), '') in ('owner', 'administrator');
$$;

create or replace function public.can_write_payer_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.payer_org_role(p_org_id), '') in ('owner', 'administrator', 'staff');
$$;

create or replace function public.is_payer_org_verified(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payer_profiles p
    where p.organization_id = p_org_id
      and p.verification_status = 'verified'
  );
$$;

grant execute on function public.is_payer_org_member(uuid) to authenticated;
grant execute on function public.payer_org_role(uuid) to authenticated;
grant execute on function public.can_manage_payer_org(uuid) to authenticated;
grant execute on function public.can_write_payer_org(uuid) to authenticated;
grant execute on function public.is_payer_org_verified(uuid) to authenticated;

-- ========== RLS ==========
alter table public.payer_organizations enable row level security;
alter table public.payer_profiles enable row level security;
alter table public.payer_org_members enable row level security;

-- Catalog: members read own org; SoftLyft staff read all; admins manage.
create policy "Payer members read own catalog org"
  on public.payer_organizations for select to authenticated
  using (
    public.is_payer_org_member(id)
    or public.is_staff()
  );

create policy "Staff manage payer catalog"
  on public.payer_organizations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Profiles
create policy "Payer members read own org profile"
  on public.payer_profiles for select to authenticated
  using (public.is_payer_org_member(organization_id) or public.is_staff());

create policy "Payer managers update own org profile"
  on public.payer_profiles for update to authenticated
  using (public.can_manage_payer_org(organization_id) or public.is_admin())
  with check (public.can_manage_payer_org(organization_id) or public.is_admin());

create policy "Payer managers insert org profile"
  on public.payer_profiles for insert to authenticated
  with check (public.can_manage_payer_org(organization_id) or public.is_admin());

-- Members
create policy "Payer members read org membership"
  on public.payer_org_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_payer_org_member(organization_id)
    or public.is_staff()
  );

create policy "Payer managers manage membership"
  on public.payer_org_members for all to authenticated
  using (public.can_manage_payer_org(organization_id) or public.is_admin())
  with check (public.can_manage_payer_org(organization_id) or public.is_admin());

grant select on public.payer_organizations to authenticated;
grant select, insert, update on public.payer_profiles to authenticated;
grant select, insert, update, delete on public.payer_org_members to authenticated;

grant all on public.payer_organizations to service_role;
grant all on public.payer_profiles to service_role;
grant all on public.payer_org_members to service_role;
