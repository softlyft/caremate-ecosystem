-- Unique claim contact email for active payer orgs (connect-by-email + claim).
-- Prefer keeping the oldest active row when duplicates exist.

with ranked as (
  select
    id,
    row_number() over (
      partition by lower(btrim(email))
      order by created_at asc, id asc
    ) as rn
  from public.payer_organizations
  where deleted_at is null
    and email is not null
    and btrim(email) <> ''
)
update public.payer_organizations po
set email = null,
    updated_at = now()
from ranked r
where po.id = r.id
  and r.rn > 1;

drop index if exists public.payer_organizations_email_lower_idx;

create unique index if not exists payer_organizations_email_uidx
  on public.payer_organizations (lower(btrim(email)))
  where deleted_at is null
    and email is not null
    and btrim(email) <> '';

comment on index public.payer_organizations_email_uidx is
  'One active payer catalog row per claim contact email.';

-- updated_at triggers (set_updated_at already exists from provider portal)
drop trigger if exists payer_organizations_set_updated_at on public.payer_organizations;
create trigger payer_organizations_set_updated_at
  before update on public.payer_organizations
  for each row execute function public.set_updated_at();

drop trigger if exists payer_profiles_set_updated_at on public.payer_profiles;
create trigger payer_profiles_set_updated_at
  before update on public.payer_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists payer_org_members_set_updated_at on public.payer_org_members;
create trigger payer_org_members_set_updated_at
  before update on public.payer_org_members
  for each row execute function public.set_updated_at();

drop trigger if exists provider_payer_connections_set_updated_at
  on public.provider_payer_connections;
create trigger provider_payer_connections_set_updated_at
  before update on public.provider_payer_connections
  for each row execute function public.set_updated_at();

-- Claim-email helpers are for security-definer RPCs only (reduce enumeration).
revoke all on function public.find_verified_provider_org_id_by_claim_email(text) from public;
revoke all on function public.find_verified_provider_org_id_by_claim_email(text) from anon, authenticated;
revoke all on function public.find_verified_payer_org_id_by_claim_email(text) from public;
revoke all on function public.find_verified_payer_org_id_by_claim_email(text) from anon, authenticated;
