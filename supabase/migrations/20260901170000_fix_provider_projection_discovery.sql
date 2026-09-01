-- Fix Nearby catalog projection: text/uuid id compare, org-first naming, profile type fallback.
-- Pins without lat/lng remain discoverable via search_providers_by_name (geo is optional).

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
    (
      select pp.organization_type
      from public.provider_profiles pp
      where pp.organization_id = loc.organization_id
        and pp.organization_type is not null
        and length(trim(pp.organization_type)) > 0
      limit 1
    ),
    'clinic'
  )
  into provider_type;

  -- Org name drives name search; append branch when the location label differs.
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

  -- Soft-delete legacy org-id pins (providers.id is text).
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

create or replace function public.rebuild_provider_projection_for_location(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.provider_locations
  where id = p_location_id;

  if not found then
    raise exception 'location % not found', p_location_id;
  end if;

  if not (
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or public.can_manage_provider_org(v_org_id)
    or public.can_edit_catalog()
  ) then
    raise exception 'not authorized to rebuild projection for location %', p_location_id;
  end if;

  perform public._rebuild_provider_projection_impl(p_location_id);
end;
$$;

revoke all on function public._rebuild_provider_projection_impl(uuid) from public;
grant execute on function public._rebuild_provider_projection_impl(uuid) to service_role;

revoke all on function public.rebuild_provider_projection_for_location(uuid) from public;
grant execute on function public.rebuild_provider_projection_for_location(uuid) to authenticated;
grant execute on function public.rebuild_provider_projection_for_location(uuid) to service_role;

comment on function public.rebuild_provider_projection_for_location(uuid) is
  'Rebuild Nearby/search providers pin for one location. Geo optional; name+type power catalog search.';

-- Backfill pins for active locations missing from providers (e.g. portal writes before uuid/text fix).
do $$
declare
  loc_id uuid;
  rebuilt integer := 0;
begin
  for loc_id in
    select l.id
    from public.provider_locations l
    where l.deleted_at is null
      and not exists (
        select 1
        from public.providers p
        where p.id = l.id::text
          and p.deleted_at is null
          and p.active = true
      )
  loop
    perform public._rebuild_provider_projection_impl(loc_id);
    rebuilt := rebuilt + 1;
  end loop;
  raise notice 'rebuild_provider_projection backfill: % locations', rebuilt;
end;
$$;
