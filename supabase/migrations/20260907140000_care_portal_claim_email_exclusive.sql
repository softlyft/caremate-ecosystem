-- Care Portal claim emails are exclusive across provider and payer catalogs.
-- The same contact email must never be assigned to both org kinds.

create or replace function public.care_portal_claim_email_key(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(btrim(p_email)), '');
$$;

comment on function public.care_portal_claim_email_key(text) is
  'Normalized catalog claim email key (lower + trim).';

create or replace function public.care_portal_claim_email_owned_by(
  p_email text,
  p_exclude_provider_org_id uuid default null,
  p_exclude_payer_org_id uuid default null
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := public.care_portal_claim_email_key(p_email);
begin
  if v_key is null then
    return null;
  end if;

  if exists (
    select 1
    from public.payer_organizations po
    where po.deleted_at is null
      and po.email is not null
      and public.care_portal_claim_email_key(po.email) = v_key
      and (p_exclude_payer_org_id is null or po.id <> p_exclude_payer_org_id)
  ) then
    return 'payer';
  end if;

  if exists (
    select 1
    from public.provider_profiles pp
    where public.care_portal_claim_email_key(pp.email) = v_key
      and (p_exclude_provider_org_id is null or pp.organization_id <> p_exclude_provider_org_id)
  ) then
    return 'provider';
  end if;

  if exists (
    select 1
    from public.provider_locations pl
    where pl.deleted_at is null
      and pl.email is not null
      and public.care_portal_claim_email_key(pl.email) = v_key
      and (p_exclude_provider_org_id is null or pl.organization_id <> p_exclude_provider_org_id)
  ) then
    return 'provider';
  end if;

  return null;
end;
$$;

comment on function public.care_portal_claim_email_owned_by(text, uuid, uuid) is
  'Returns provider|payer if the email is already a catalog claim contact for that kind, else null.';

grant execute on function public.care_portal_claim_email_owned_by(text, uuid, uuid) to authenticated;
grant execute on function public.care_portal_claim_email_owned_by(text, uuid, uuid) to service_role;

create or replace function public.enforce_care_portal_claim_email_exclusive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text;
  v_exclude_provider uuid := null;
  v_exclude_payer uuid := null;
begin
  if tg_table_name = 'payer_organizations' then
    if public.care_portal_claim_email_key(new.email) is null then
      return new;
    end if;
    v_exclude_payer := new.id;
    v_owner := public.care_portal_claim_email_owned_by(new.email, null, v_exclude_payer);
    if v_owner = 'provider' then
      raise exception
        'Care Portal claim email % is already used by a provider organization',
        public.care_portal_claim_email_key(new.email);
    end if;
    return new;
  end if;

  if tg_table_name in ('provider_profiles', 'provider_locations') then
    if public.care_portal_claim_email_key(new.email) is null then
      return new;
    end if;
    v_exclude_provider := new.organization_id;
    v_owner := public.care_portal_claim_email_owned_by(new.email, v_exclude_provider, null);
    if v_owner = 'payer' then
      raise exception
        'Care Portal claim email % is already used by a payer organization',
        public.care_portal_claim_email_key(new.email);
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists payer_organizations_claim_email_exclusive on public.payer_organizations;
create trigger payer_organizations_claim_email_exclusive
  before insert or update of email on public.payer_organizations
  for each row
  execute function public.enforce_care_portal_claim_email_exclusive();

drop trigger if exists provider_profiles_claim_email_exclusive on public.provider_profiles;
create trigger provider_profiles_claim_email_exclusive
  before insert or update of email on public.provider_profiles
  for each row
  execute function public.enforce_care_portal_claim_email_exclusive();

drop trigger if exists provider_locations_claim_email_exclusive on public.provider_locations;
create trigger provider_locations_claim_email_exclusive
  before insert or update of email on public.provider_locations
  for each row
  execute function public.enforce_care_portal_claim_email_exclusive();
