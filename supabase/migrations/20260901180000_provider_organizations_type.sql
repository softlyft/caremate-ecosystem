-- Optional catalog type on provider_organizations (7 Nearby chips).
-- Flows into providers.type on projection rebuild for name + chip search.

alter table public.provider_organizations
  add column if not exists type text;

alter table public.provider_organizations
  drop constraint if exists provider_organizations_type_check;

alter table public.provider_organizations
  add constraint provider_organizations_type_check
  check (
    type is null
    or type in (
      'hospital',
      'clinic',
      'pharmacy',
      'laboratory',
      'imaging_centre',
      'dentist',
      'eye_care'
    )
  );

comment on column public.provider_organizations.type is
  'Optional Nearby catalog type (7 chips). Used for search/filter when projected to providers.type.';

-- Backfill org.type from the best existing provider pin per org.
update public.provider_organizations o
set
  type = sub.type,
  updated_at = now()
from (
  select distinct on (p.organization_id)
    p.organization_id,
    p.type
  from public.providers p
  where p.organization_id is not null
    and p.deleted_at is null
    and p.active = true
    and p.type in (
      'hospital',
      'clinic',
      'pharmacy',
      'laboratory',
      'imaging_centre',
      'dentist',
      'eye_care'
    )
  order by p.organization_id, p.updated_at desc nulls last
) sub
where o.id = sub.organization_id
  and o.deleted_at is null
  and o.type is null;

-- Re-define projection impl: org.type before portal profile fallback.
create or replace function public._rebuild_provider_projection_impl(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  loc public.provider_locations%rowtype;
  org public.provider_organizations%rowtype;
  provider_type text := 'clinic';
  pin_name text;
  pin_active boolean;
  service_ids jsonb := '[]'::jsonb;
  service_attrs jsonb := '[]'::jsonb;
  now_ts timestamptz := now();
begin
  select * into loc
  from public.provider_locations
  where id = p_location_id;

  if not found then
    raise exception 'location % not found', p_location_id;
  end if;

  if loc.deleted_at is not null then
    update public.providers
    set
      deleted_at = coalesce(deleted_at, now_ts),
      active = false,
      updated_at = now_ts
    where id = p_location_id::text;
    return;
  end if;

  select * into org
  from public.provider_organizations
  where id = loc.organization_id
    and deleted_at is null;

  select
    coalesce(jsonb_agg(s.id order by s.name), '[]'::jsonb),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'type', s.service_type,
          'active', s.active
        )
        order by s.name
      ),
      '[]'::jsonb
    )
  into service_ids, service_attrs
  from public.provider_healthcare_services s
  where s.location_id = p_location_id
    and s.deleted_at is null;

  select coalesce(
    (
      select s.service_type
      from public.provider_healthcare_services s
      where s.location_id = p_location_id
        and s.deleted_at is null
        and s.service_type is not null
        and length(trim(s.service_type)) > 0
      order by s.name
      limit 1
    ),
    nullif(trim(org.type), ''),
    (
      select pp.organization_type
      from public.provider_profiles pp
      where pp.organization_id = loc.organization_id
        and pp.organization_type is not null
        and length(trim(pp.organization_type)) > 0
        and pp.organization_type in (
          'hospital',
          'clinic',
          'pharmacy',
          'laboratory',
          'imaging_centre',
          'dentist',
          'eye_care'
        )
      limit 1
    ),
    'clinic'
  )
  into provider_type;

  pin_name := coalesce(nullif(trim(org.name), ''), nullif(trim(loc.name), ''), 'Unknown provider');
  if org.name is not null
    and nullif(trim(loc.name), '') is not null
    and lower(trim(loc.name)) <> lower(trim(org.name)) then
    pin_name := trim(org.name) || ' — ' || trim(loc.name);
  end if;

  pin_active := coalesce(org.active, true) and coalesce(loc.status, 'active') = 'active';

  insert into public.providers as p (
    id,
    name,
    type,
    address,
    phone,
    email,
    latitude,
    longitude,
    distance_km,
    attributes,
    external_id,
    source,
    active,
    last_ingested_at,
    deleted_at,
    organization_id,
    location_id,
    healthcare_service_ids,
    updated_at
  )
  values (
    loc.id::text,
    pin_name,
    provider_type,
    loc.address,
    coalesce(loc.phone, null),
    coalesce(loc.email, null),
    loc.latitude,
    loc.longitude,
    loc.distance_km,
    jsonb_build_object(
      'organization_id', loc.organization_id,
      'location_id', loc.id,
      'location_name', nullif(trim(loc.name), ''),
      'services', service_attrs
    ),
    loc.id::text,
    coalesce(loc.source, 'provider_portal'),
    pin_active,
    now_ts,
    null,
    loc.organization_id,
    loc.id,
    service_ids,
    now_ts
  )
  on conflict (id) do update
  set
    name = excluded.name,
    type = excluded.type,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    distance_km = excluded.distance_km,
    attributes = excluded.attributes,
    external_id = excluded.external_id,
    source = excluded.source,
    active = excluded.active,
    last_ingested_at = excluded.last_ingested_at,
    deleted_at = null,
    organization_id = excluded.organization_id,
    location_id = excluded.location_id,
    healthcare_service_ids = excluded.healthcare_service_ids,
    updated_at = excluded.updated_at;

  if loc.organization_id is not null and loc.organization_id::text <> loc.id::text then
    update public.providers
    set
      deleted_at = coalesce(deleted_at, now_ts),
      active = false,
      updated_at = now_ts
    where id = loc.organization_id::text;
  end if;
end;
$$;

-- Refresh search pins after org.type is available.
do $$
declare
  loc_id uuid;
  rebuilt integer := 0;
begin
  for loc_id in
    select l.id
    from public.provider_locations l
    join public.provider_organizations o on o.id = l.organization_id
    where l.deleted_at is null
      and o.deleted_at is null
  loop
    perform public._rebuild_provider_projection_impl(loc_id);
    rebuilt := rebuilt + 1;
  end loop;
  raise notice 'provider projection refresh after org.type: % locations', rebuilt;
end;
$$;
