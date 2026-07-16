-- Online Nearby: geo-page providers by distance (no full-catalog sync).
-- Haversine + bbox prefilter; SECURITY DEFINER so guests (anon) can query the public catalog.

create index if not exists providers_geo_active_idx
  on public.providers (latitude, longitude)
  where deleted_at is null
    and active = true
    and latitude is not null
    and longitude is not null;

create index if not exists providers_type_active_idx
  on public.providers (type)
  where deleted_at is null and active = true;

create or replace function public.nearby_providers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 25,
  p_type text default null,
  p_search text default null,
  p_limit integer default 100
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
      p_lat as lat,
      p_lng as lng,
      greatest(coalesce(p_radius_km, 25), 0.1) as radius_km,
      nullif(trim(p_type), '') as type_filter,
      nullif(trim(p_search), '') as search_filter,
      least(greatest(coalesce(p_limit, 100), 1), 200) as row_limit,
      greatest(coalesce(p_radius_km, 25), 0.1) / 111.0 as lat_delta,
      greatest(coalesce(p_radius_km, 25), 0.1) / (111.0 * greatest(cos(radians(p_lat)), 0.01)) as lng_delta
  ),
  ranked as (
    select
      p.id,
      p.name,
      p.type,
      p.address,
      p.phone,
      p.email,
      p.latitude,
      p.longitude,
      (
        6371 * acos(
          least(
            1.0,
            greatest(
              -1.0,
              cos(radians(params.lat)) * cos(radians(p.latitude))
                * cos(radians(p.longitude) - radians(params.lng))
                + sin(radians(params.lat)) * sin(radians(p.latitude))
            )
          )
        )
      ) as distance_km,
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
    where p.deleted_at is null
      and p.active = true
      and p.latitude is not null
      and p.longitude is not null
      and p.latitude between params.lat - params.lat_delta and params.lat + params.lat_delta
      and p.longitude between params.lng - params.lng_delta and params.lng + params.lng_delta
      and (params.type_filter is null or p.type = params.type_filter)
      and (
        params.search_filter is null
        or p.name ilike '%' || params.search_filter || '%'
        or coalesce(p.address, '') ilike '%' || params.search_filter || '%'
      )
  )
  select *
  from ranked
  where distance_km <= (select radius_km from params)
  order by distance_km asc
  limit (select row_limit from params);
$$;

comment on function public.nearby_providers is
  'Geo-page Nearby pins for mobile. Prefer this over full providers select(*).';

grant execute on function public.nearby_providers(
  double precision, double precision, double precision, text, text, integer
) to anon, authenticated;

-- Public read of live catalog rows (optional path for id hydrate)
drop policy if exists "Public read live providers" on public.providers;
create policy "Public read live providers"
  on public.providers for select
  to anon, authenticated
  using (deleted_at is null and active = true);
