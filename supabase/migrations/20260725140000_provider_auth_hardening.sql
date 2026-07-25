-- Provider portal auth hardening: one active member per org, OTP send throttle,
-- location email index, and auth user email lookup for service role.

-- If any org already has multiple active members, keep the oldest and soft-delete the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by organization_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.provider_org_members
  where deleted_at is null
)
update public.provider_org_members m
set deleted_at = now()
from ranked r
where m.id = r.id
  and r.rn > 1;

-- One active membership per organization (blocks concurrent claim races).
create unique index if not exists provider_org_members_one_active_per_org_uidx
  on public.provider_org_members (organization_id)
  where deleted_at is null;

-- Fast catalog email matches for claim.
create index if not exists provider_locations_email_lower_idx
  on public.provider_locations (lower(email))
  where deleted_at is null and email is not null;

-- OTP send throttle (service role only).
create table if not exists public.provider_auth_otp_sends (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('claim', 'password_reset')),
  email text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists provider_auth_otp_sends_email_idx
  on public.provider_auth_otp_sends (kind, lower(email), created_at desc);

create index if not exists provider_auth_otp_sends_ip_idx
  on public.provider_auth_otp_sends (ip_hash, created_at desc)
  where ip_hash is not null;

alter table public.provider_auth_otp_sends enable row level security;

comment on table public.provider_auth_otp_sends is
  'Throttle log for provider claim / password-reset OTP emails. Service role only.';

revoke all on public.provider_auth_otp_sends from anon, authenticated;
grant all on public.provider_auth_otp_sends to service_role;

-- Resolve auth user by email without paginating listUsers.
create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

comment on function public.get_auth_user_id_by_email(text) is
  'Service-role helper: map email → auth.users.id without listing all users.';

revoke all on function public.get_auth_user_id_by_email(text) from public;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;

-- Unclaimed orgs whose FHIR Organization.contact telecom email matches.
create or replace function public.find_unclaimed_orgs_by_contact_email(p_email text)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select lower(trim(p_email)) as email
  ),
  claimed as (
    select distinct m.organization_id
    from public.provider_org_members m
    where m.deleted_at is null
  ),
  contact_emails as (
    select
      o.id as org_id,
      o.name as org_name,
      lower(trim(tel->>'value')) as email
    from public.provider_organizations o
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(o.resource->'contact', '[]'::jsonb)) = 'array'
          then coalesce(o.resource->'contact', '[]'::jsonb)
        when o.resource ? 'contact'
          then jsonb_build_array(o.resource->'contact')
        else '[]'::jsonb
      end
    ) as contact
    cross join lateral jsonb_array_elements(coalesce(contact->'telecom', '[]'::jsonb)) as tel
    where o.deleted_at is null
      and lower(coalesce(tel->>'system', '')) = 'email'
  )
  select distinct ce.org_id, ce.org_name
  from contact_emails ce
  cross join normalized n
  where ce.email = n.email
    and ce.org_id not in (select organization_id from claimed);
$$;

comment on function public.find_unclaimed_orgs_by_contact_email(text) is
  'Claim fallback: match Organization FHIR contact email for unclaimed orgs.';

revoke all on function public.find_unclaimed_orgs_by_contact_email(text) from public;
grant execute on function public.find_unclaimed_orgs_by_contact_email(text) to service_role;
