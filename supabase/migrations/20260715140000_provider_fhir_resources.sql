-- FHIR write model + providers as denormalized Nearby projection (1 pin ≈ 1 Location).
-- Org 1→N Location 1→N HealthcareService. Ingest order: organization → location → healthcareservice.

-- ========== provider_organizations ==========
create table if not exists public.provider_organizations (
  id text primary key,
  name text not null,
  active boolean not null default true,
  resource jsonb not null default '{}'::jsonb,
  source text,
  last_ingested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_organizations_name_idx
  on public.provider_organizations (name);

alter table public.provider_organizations enable row level security;

drop policy if exists "Authenticated read provider_organizations" on public.provider_organizations;
create policy "Authenticated read provider_organizations"
  on public.provider_organizations for select
  to authenticated
  using (true);

drop policy if exists "Staff write provider_organizations" on public.provider_organizations;
create policy "Staff write provider_organizations"
  on public.provider_organizations for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ========== provider_locations ==========
create table if not exists public.provider_locations (
  id text primary key,
  organization_id text not null references public.provider_organizations (id) on delete cascade,
  name text not null,
  status text not null default 'active',
  latitude double precision,
  longitude double precision,
  address text,
  phone text,
  email text,
  distance_km double precision,
  resource jsonb not null default '{}'::jsonb,
  source text,
  last_ingested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_locations_organization_id_idx
  on public.provider_locations (organization_id);

create index if not exists provider_locations_geo_idx
  on public.provider_locations (latitude, longitude)
  where latitude is not null and longitude is not null;

alter table public.provider_locations enable row level security;

drop policy if exists "Authenticated read provider_locations" on public.provider_locations;
create policy "Authenticated read provider_locations"
  on public.provider_locations for select
  to authenticated
  using (true);

drop policy if exists "Staff write provider_locations" on public.provider_locations;
create policy "Staff write provider_locations"
  on public.provider_locations for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ========== provider_healthcare_services ==========
create table if not exists public.provider_healthcare_services (
  id text primary key,
  organization_id text not null references public.provider_organizations (id) on delete cascade,
  location_id text references public.provider_locations (id) on delete set null,
  name text not null,
  active boolean not null default true,
  service_type text,
  resource jsonb not null default '{}'::jsonb,
  source text,
  last_ingested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_healthcare_services_organization_id_idx
  on public.provider_healthcare_services (organization_id);

create index if not exists provider_healthcare_services_location_id_idx
  on public.provider_healthcare_services (location_id);

alter table public.provider_healthcare_services enable row level security;

drop policy if exists "Authenticated read provider_healthcare_services" on public.provider_healthcare_services;
create policy "Authenticated read provider_healthcare_services"
  on public.provider_healthcare_services for select
  to authenticated
  using (true);

drop policy if exists "Staff write provider_healthcare_services" on public.provider_healthcare_services;
create policy "Staff write provider_healthcare_services"
  on public.provider_healthcare_services for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ========== providers = Nearby projection (one row per Location) ==========
alter table public.providers
  add column if not exists organization_id text,
  add column if not exists location_id text,
  add column if not exists healthcare_service_ids jsonb not null default '[]'::jsonb;

create index if not exists providers_organization_id_idx
  on public.providers (organization_id);

create index if not exists providers_location_id_idx
  on public.providers (location_id);

create unique index if not exists providers_location_id_uidx
  on public.providers (location_id)
  where location_id is not null and deleted_at is null;

comment on table public.providers is
  'Denormalized Nearby catalog: one pin per Location. Source of truth is provider_organizations / locations / healthcare_services.';
