-- FHIR-aligned connection consent: registry + Consent rows.
-- shared_scopes remains a denormalized permit cache for existing RLS / portal checks.

-- ========== Consent definition catalog ==========
create table if not exists public.consent_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  organization_id uuid references public.provider_organizations (id) on delete cascade,
  source text not null
    check (source in ('system', 'organization')),
  fhir_scope text not null default 'patient-privacy',
  fhir_category jsonb not null default jsonb_build_object(
    'coding',
    jsonb_build_array(
      jsonb_build_object(
        'system', 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        'code', 'patient-privacy'
      )
    )
  ),
  fhir_policy_rule text not null default 'OPTIN',
  data_class text not null,
  title text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_definitions_source_org_check check (
    (source = 'system' and organization_id is null)
    or (source = 'organization' and organization_id is not null)
  )
);

-- System definitions: unique code globally. Org-custom: unique per org.
create unique index if not exists consent_definitions_system_code_uidx
  on public.consent_definitions (code)
  where organization_id is null;

create unique index if not exists consent_definitions_org_code_uidx
  on public.consent_definitions (organization_id, code)
  where organization_id is not null;

create index if not exists consent_definitions_org_active_idx
  on public.consent_definitions (organization_id, active);

comment on table public.consent_definitions is
  'CareMate (system) and future org-custom consent catalog entries. Maps to FHIR Consent category / policy context.';

comment on column public.consent_definitions.code is
  'Stable machine id used in shared_scopes cache (e.g. emergency).';

comment on column public.consent_definitions.data_class is
  'Logical data class covered (e.g. emergency_profile); used when gating clinical APIs.';

comment on column public.consent_definitions.fhir_scope is
  'FHIR Consent.scope code; privacy sharing uses patient-privacy.';

-- Seed CareMate emergency definition
insert into public.consent_definitions (
  code,
  organization_id,
  source,
  fhir_scope,
  fhir_category,
  fhir_policy_rule,
  data_class,
  title,
  description,
  active
)
select
  'emergency',
  null,
  'system',
  'patient-privacy',
  jsonb_build_object(
    'coding',
    jsonb_build_array(
      jsonb_build_object(
        'system', 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        'code', 'patient-privacy'
      )
    ),
    'text', 'Privacy Consent'
  ),
  'OPTIN',
  'emergency_profile',
  'Emergency profile',
  'Blood group, allergies, conditions, insurance, and emergency contacts.',
  true
where not exists (
  select 1 from public.consent_definitions d
  where d.code = 'emergency' and d.organization_id is null
);

-- ========== FHIR Consent–shaped grants ==========
create table if not exists public.patient_provider_consents (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null
    references public.patient_provider_connections (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  definition_id uuid not null
    references public.consent_definitions (id) on delete restrict,
  status text not null default 'active'
    check (status in ('draft', 'active', 'inactive', 'entered-in-error')),
  fhir_scope text not null default 'patient-privacy',
  provision_type text not null default 'permit'
    check (provision_type in ('permit', 'deny')),
  purpose text not null default 'TREAT',
  granted_at timestamptz,
  revoked_at timestamptz,
  source text not null default 'patient'
    check (source in ('patient', 'proxy', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active grant per connection + definition
create unique index if not exists patient_provider_consents_active_uidx
  on public.patient_provider_consents (connection_id, definition_id)
  where status = 'active';

create index if not exists patient_provider_consents_patient_idx
  on public.patient_provider_consents (patient_id, status);

create index if not exists patient_provider_consents_org_idx
  on public.patient_provider_consents (organization_id, status);

create index if not exists patient_provider_consents_connection_idx
  on public.patient_provider_consents (connection_id);

comment on table public.patient_provider_consents is
  'FHIR Consent–aligned privacy directives per connection. status=active is a granted permit.';

comment on column public.patient_provider_consents.fhir_scope is
  'FHIR Consent.scope (patient-privacy for information sharing).';

comment on column public.patient_provider_consents.provision_type is
  'FHIR Consent.provision.type: permit | deny.';

comment on column public.patient_provider_consents.purpose is
  'FHIR PurposeOfUse code; default TREAT.';

drop trigger if exists consent_definitions_set_updated_at on public.consent_definitions;
create trigger consent_definitions_set_updated_at
  before update on public.consent_definitions
  for each row
  execute function public.set_updated_at();

drop trigger if exists patient_provider_consents_set_updated_at on public.patient_provider_consents;
create trigger patient_provider_consents_set_updated_at
  before update on public.patient_provider_consents
  for each row
  execute function public.set_updated_at();

-- ========== Sync shared_scopes cache from active permits ==========
create or replace function public.sync_connection_shared_scopes(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes text[];
begin
  select coalesce(array_agg(d.code order by d.code), array[]::text[])
  into v_codes
  from public.patient_provider_consents c
  join public.consent_definitions d on d.id = c.definition_id
  where c.connection_id = p_connection_id
    and c.status = 'active'
    and c.provision_type = 'permit';

  perform set_config('caremate.syncing_shared_scopes', '1', true);

  update public.patient_provider_connections
  set
    shared_scopes = array['basic']::text[] || v_codes,
    updated_at = now()
  where id = p_connection_id;

  perform set_config('caremate.syncing_shared_scopes', '0', true);
end;
$$;

create or replace function public.protect_connection_shared_scopes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Allow the denormalized cache sync trigger path.
  if current_setting('caremate.syncing_shared_scopes', true) = '1' then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.shared_scopes is distinct from old.shared_scopes
    and auth.uid() is distinct from new.patient_id
  then
    raise exception 'Only the patient can change shared_scopes';
  end if;
  return new;
end;
$$;

create or replace function public.patient_provider_consents_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection_id uuid;
begin
  v_connection_id := coalesce(new.connection_id, old.connection_id);
  perform public.sync_connection_shared_scopes(v_connection_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists patient_provider_consents_sync_scopes
  on public.patient_provider_consents;

create trigger patient_provider_consents_sync_scopes
  after insert or update or delete on public.patient_provider_consents
  for each row
  execute function public.patient_provider_consents_after_change();

-- Validate shared_scopes: must include basic; non-basic codes must exist in catalog
create or replace function public.validate_connection_shared_scopes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_code text;
  v_ok boolean;
begin
  if not ('basic' = any (new.shared_scopes)) then
    raise exception 'shared_scopes must include basic';
  end if;

  foreach v_code in array new.shared_scopes
  loop
    if v_code = 'basic' then
      continue;
    end if;

    select exists (
      select 1
      from public.consent_definitions d
      where d.code = v_code
        and d.active = true
        and (
          d.organization_id is null
          or d.organization_id = new.organization_id
        )
    )
    into v_ok;

    if not v_ok then
      raise exception 'Unknown or inactive consent scope: %', v_code;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists patient_provider_connections_validate_scopes
  on public.patient_provider_connections;

create trigger patient_provider_connections_validate_scopes
  before insert or update of shared_scopes on public.patient_provider_connections
  for each row
  execute function public.validate_connection_shared_scopes();

-- Drop closed allowlist; catalog + trigger validate instead
alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_shared_scopes_valid;

alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_shared_scopes_has_basic;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_shared_scopes_has_basic
  check ('basic' = any (shared_scopes));

comment on column public.patient_provider_connections.shared_scopes is
  'Denormalized permit cache: always includes basic; other codes mirror active patient_provider_consents. Source of truth is patient_provider_consents.';

-- Backfill active consent rows from any remaining emergency scopes
insert into public.patient_provider_consents (
  connection_id,
  patient_id,
  organization_id,
  definition_id,
  status,
  fhir_scope,
  provision_type,
  purpose,
  granted_at,
  source
)
select
  c.id,
  c.patient_id,
  c.organization_id,
  d.id,
  'active',
  d.fhir_scope,
  'permit',
  'TREAT',
  coalesce(c.approved_at, c.updated_at, now()),
  'patient'
from public.patient_provider_connections c
cross join public.consent_definitions d
where d.code = 'emergency'
  and d.organization_id is null
  and 'emergency' = any (c.shared_scopes)
  and not exists (
    select 1
    from public.patient_provider_consents ppc
    where ppc.connection_id = c.id
      and ppc.definition_id = d.id
      and ppc.status = 'active'
  );

-- Re-sync all connection scopes from consents (normalizes cache)
do $$
declare
  r record;
begin
  for r in select id from public.patient_provider_connections
  loop
    perform public.sync_connection_shared_scopes(r.id);
  end loop;
end;
$$;

-- ========== RLS ==========
alter table public.consent_definitions enable row level security;
alter table public.patient_provider_consents enable row level security;

drop policy if exists "Authenticated read active consent definitions"
  on public.consent_definitions;
create policy "Authenticated read active consent definitions"
  on public.consent_definitions for select to authenticated
  using (
    active = true
    and (
      organization_id is null
      or public.is_provider_org_member(organization_id)
      or exists (
        select 1
        from public.patient_provider_connections c
        where c.organization_id = consent_definitions.organization_id
          and c.patient_id = auth.uid()
      )
      or public.is_staff()
    )
  );

drop policy if exists "Staff manage consent definitions"
  on public.consent_definitions;
create policy "Staff manage consent definitions"
  on public.consent_definitions for all to authenticated
  using (public.is_admin() or public.is_staff())
  with check (public.is_admin() or public.is_staff());

drop policy if exists "Patients manage own consents"
  on public.patient_provider_consents;
create policy "Patients manage own consents"
  on public.patient_provider_consents for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "Provider members read org consents"
  on public.patient_provider_consents;
create policy "Provider members read org consents"
  on public.patient_provider_consents for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

grant select on public.consent_definitions to authenticated;
grant select, insert, update, delete on public.patient_provider_consents to authenticated;
