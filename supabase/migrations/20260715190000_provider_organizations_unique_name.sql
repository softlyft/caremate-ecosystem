-- Deduplicate organizations (keep earliest per name) and enforce unique active names.

with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(name))
      order by created_at asc, id asc
    ) as rn
  from public.provider_organizations
  where deleted_at is null
)
update public.provider_organizations o
set
  deleted_at = now(),
  active = false,
  updated_at = now()
from ranked r
where o.id = r.id
  and r.rn > 1;

drop index if exists public.provider_organizations_name_uidx;

create unique index provider_organizations_name_uidx
  on public.provider_organizations (lower(trim(name)))
  where deleted_at is null;

comment on index public.provider_organizations_name_uidx is
  'Active organizations must have unique names (case-insensitive).';
