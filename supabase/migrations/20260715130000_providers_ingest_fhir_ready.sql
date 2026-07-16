-- Provider catalog: ingest + FHIR-ready identity fields (soft-delete aligned with articles/tips).

alter table public.providers
  add column if not exists external_id text,
  add column if not exists source text,
  add column if not exists active boolean not null default true,
  add column if not exists last_ingested_at timestamptz,
  add column if not exists deleted_at timestamptz;

create unique index if not exists providers_external_id_uidx
  on public.providers (external_id)
  where external_id is not null;

create index if not exists providers_deleted_at_idx
  on public.providers (deleted_at)
  where deleted_at is not null;

create index if not exists providers_active_idx
  on public.providers (active)
  where active = true;
