-- Fix overly broad unique index: orgs may have many active staff members.
-- Claim race control is "one active owner", not "one active member".

drop index if exists public.provider_org_members_one_active_per_org_uidx;

create unique index if not exists provider_org_members_one_active_owner_per_org_uidx
  on public.provider_org_members (organization_id)
  where deleted_at is null and role = 'owner';

comment on index public.provider_org_members_one_active_owner_per_org_uidx is
  'At most one active owner per organization (blocks concurrent claim races; staff/admin/viewer allowed).';
