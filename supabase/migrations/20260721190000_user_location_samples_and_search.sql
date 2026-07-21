-- User location history (last 20 exact GPS samples) + location-independent provider name search.

-- ========== user_location_samples ==========
create table if not exists public.user_location_samples (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  accuracy double precision,
  altitude_accuracy double precision,
  heading double precision,
  speed double precision,
  mocked boolean,
  captured_at timestamptz not null,
  source text not null default 'gps',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_location_samples_user_captured_idx
  on public.user_location_samples (user_id, captured_at desc);

alter table public.user_location_samples enable row level security;

drop policy if exists "Users manage own user_location_samples" on public.user_location_samples;
create policy "Users manage own user_location_samples"
  on public.user_location_samples for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_location_samples is
  'Exact GPS samples for Nearby ranking history. Owner-only; retain newest 20 per user.';

-- Keep only the newest 20 samples for the authenticated user after each insert/upsert.
create or replace function public.prune_user_location_samples(p_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if auth.uid() is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  with ranked as (
    select id,
      row_number() over (order by captured_at desc, created_at desc) as rn
    from public.user_location_samples
    where user_id = v_user_id
  ),
  doomed as (
    select id from ranked where rn > 20
  )
  delete from public.user_location_samples s
  using doomed
  where s.id = doomed.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_user_location_samples(uuid) from public;
grant execute on function public.prune_user_location_samples(uuid) to authenticated;

-- ========== search_providers_by_name (non-geo) ==========
create extension if not exists pg_trgm;

create index if not exists providers_name_trgm_idx
  on public.providers using gin (name gin_trgm_ops)
  where deleted_at is null and active = true;

create index if not exists providers_address_trgm_idx
  on public.providers using gin (address gin_trgm_ops)
  where deleted_at is null and active = true and address is not null;

create or replace function public.search_providers_by_name(
  p_search text,
  p_type text default null,
  p_limit integer default 25
)
returns table (
  id text,
  name text,
  type text,
  address text,
  phone text,
  email text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  attributes jsonb,
  organization_id uuid,
  location_id uuid,
  healthcare_service_ids jsonb,
  external_id text,
  source text,
  active boolean,
  last_ingested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      nullif(trim(p_search), '') as search_filter,
      nullif(trim(p_type), '') as type_filter,
      least(greatest(coalesce(p_limit, 25), 1), 100) as row_limit
  )
  select
    p.id,
    p.name,
    p.type,
    p.address,
    p.phone,
    p.email,
    p.latitude,
    p.longitude,
    null::double precision as distance_km,
    p.attributes,
    p.organization_id,
    p.location_id,
    p.healthcare_service_ids,
    p.external_id,
    p.source,
    p.active,
    p.last_ingested_at,
    p.deleted_at,
    p.created_at,
    p.updated_at
  from public.providers p
  cross join params
  where params.search_filter is not null
    and char_length(params.search_filter) >= 1
    and p.deleted_at is null
    and p.active = true
    and (params.type_filter is null or p.type = params.type_filter)
    and (
      p.name ilike '%' || params.search_filter || '%'
      or coalesce(p.address, '') ilike '%' || params.search_filter || '%'
    )
  order by
    case
      when lower(p.name) like lower(params.search_filter) || '%' then 0
      else 1
    end,
    p.name asc
  limit (select row_limit from params);
$$;

comment on function public.search_providers_by_name is
  'Live CareMate catalog name/address search (no geo). Used by Nearby search box.';

grant execute on function public.search_providers_by_name(text, text, integer)
  to anon, authenticated;
