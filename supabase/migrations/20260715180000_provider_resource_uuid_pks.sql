-- Switch Organization / Location / HealthcareService PKs to Postgres-generated UUIDs.
-- Excel / portal: non-UUID identifier → INSERT (default gen_random_uuid);
-- UUID identifier → UPDATE existing row.
-- Wipe prior text-id seed rows so the type change is clean.

update public.providers
set
  deleted_at = coalesce(deleted_at, now()),
  active = false,
  organization_id = null,
  location_id = null,
  healthcare_service_ids = '[]'::jsonb,
  updated_at = now()
where deleted_at is null
   or organization_id is not null
   or location_id is not null;

-- Delete in FK-safe order (truncate is blocked by incoming FKs)
delete from public.provider_healthcare_services;
delete from public.provider_locations;
delete from public.provider_organizations;

alter table public.provider_locations
  drop constraint if exists provider_locations_organization_id_fkey;

alter table public.provider_healthcare_services
  drop constraint if exists provider_healthcare_services_organization_id_fkey;

alter table public.provider_healthcare_services
  drop constraint if exists provider_healthcare_services_location_id_fkey;

alter table public.provider_organizations
  alter column id drop default;

alter table public.provider_organizations
  alter column id type uuid using gen_random_uuid();

alter table public.provider_organizations
  alter column id set default gen_random_uuid();

alter table public.provider_locations
  alter column id drop default;

alter table public.provider_locations
  alter column id type uuid using gen_random_uuid();

alter table public.provider_locations
  alter column id set default gen_random_uuid();

alter table public.provider_locations
  alter column organization_id type uuid using organization_id::uuid;

alter table public.provider_healthcare_services
  alter column id drop default;

alter table public.provider_healthcare_services
  alter column id type uuid using gen_random_uuid();

alter table public.provider_healthcare_services
  alter column id set default gen_random_uuid();

alter table public.provider_healthcare_services
  alter column organization_id type uuid using organization_id::uuid;

alter table public.provider_healthcare_services
  alter column location_id type uuid using location_id::uuid;

alter table public.provider_locations
  add constraint provider_locations_organization_id_fkey
  foreign key (organization_id) references public.provider_organizations (id) on delete cascade;

alter table public.provider_healthcare_services
  add constraint provider_healthcare_services_organization_id_fkey
  foreign key (organization_id) references public.provider_organizations (id) on delete cascade;

alter table public.provider_healthcare_services
  add constraint provider_healthcare_services_location_id_fkey
  foreign key (location_id) references public.provider_locations (id) on delete set null;

-- Nearby projection FKs store the same UUIDs (as uuid columns).
alter table public.providers
  alter column organization_id type uuid
  using case
    when organization_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then organization_id::uuid
    else null
  end;

alter table public.providers
  alter column location_id type uuid
  using case
    when location_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then location_id::uuid
    else null
  end;

comment on column public.provider_organizations.id is
  'Postgres-generated UUID PK. Excel non-UUID → insert; UUID → update.';
comment on column public.provider_locations.id is
  'Postgres-generated UUID PK. Also used as providers.id (Nearby pin).';
comment on column public.provider_healthcare_services.id is
  'Postgres-generated UUID PK.';
