-- Provider portal managers can write catalog locations/services for their org,
-- and rebuild the Nearby providers pin for a location.

-- ========== RLS: provider_locations (managers) ==========
drop policy if exists "Provider managers insert locations" on public.provider_locations;
create policy "Provider managers insert locations"
  on public.provider_locations for insert
  to authenticated
  with check (public.can_manage_provider_org(organization_id) or public.can_edit_catalog());

drop policy if exists "Provider managers update locations" on public.provider_locations;
create policy "Provider managers update locations"
  on public.provider_locations for update
  to authenticated
  using (public.can_manage_provider_org(organization_id) or public.can_edit_catalog())
  with check (public.can_manage_provider_org(organization_id) or public.can_edit_catalog());

drop policy if exists "Provider managers delete locations" on public.provider_locations;
create policy "Provider managers delete locations"
  on public.provider_locations for delete
  to authenticated
  using (public.can_manage_provider_org(organization_id) or public.can_edit_catalog());

-- ========== RLS: provider_healthcare_services (managers) ==========
drop policy if exists "Provider managers insert healthcare services" on public.provider_healthcare_services;
create policy "Provider managers insert healthcare services"
  on public.provider_healthcare_services for insert
  to authenticated
  with check (
    (public.can_manage_provider_org(organization_id) or public.can_edit_catalog())
    and (
      location_id is null
      or exists (
        select 1
        from public.provider_locations l
        where l.id = location_id
          and l.organization_id = organization_id
      )
    )
  );

drop policy if exists "Provider managers update healthcare services" on public.provider_healthcare_services;
create policy "Provider managers update healthcare services"
  on public.provider_healthcare_services for update
  to authenticated
  using (public.can_manage_provider_org(organization_id) or public.can_edit_catalog())
  with check (
    (public.can_manage_provider_org(organization_id) or public.can_edit_catalog())
    and (
      location_id is null
      or exists (
        select 1
        from public.provider_locations l
        where l.id = location_id
          and l.organization_id = organization_id
      )
    )
  );

drop policy if exists "Provider managers delete healthcare services" on public.provider_healthcare_services;
create policy "Provider managers delete healthcare services"
  on public.provider_healthcare_services for delete
  to authenticated
  using (public.can_manage_provider_org(organization_id) or public.can_edit_catalog());

-- ========== Nearby projection rebuild ==========
create or replace function public.rebuild_provider_projection_for_location(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  loc public.provider_locations%rowtype;
  org public.provider_organizations%rowtype;
  provider_type text := 'clinic';
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

  if not (
    public.can_manage_provider_org(loc.organization_id)
    or public.can_edit_catalog()
  ) then
    raise exception 'not authorized to rebuild projection for location %', p_location_id;
  end if;

  if loc.deleted_at is not null then
    update public.providers
    set
      deleted_at = coalesce(deleted_at, now_ts),
      active = false,
      updated_at = now_ts
    where id = p_location_id;
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
    'clinic'
  )
  into provider_type;

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
    loc.id,
    coalesce(nullif(trim(loc.name), ''), org.name, 'Unknown provider'),
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

  -- Soft-delete legacy org-id pins so Nearby doesn't duplicate
  if loc.organization_id is not null and loc.organization_id <> loc.id then
    update public.providers
    set
      deleted_at = coalesce(deleted_at, now_ts),
      active = false,
      updated_at = now_ts
    where id = loc.organization_id;
  end if;
end;
$$;

revoke all on function public.rebuild_provider_projection_for_location(uuid) from public;
grant execute on function public.rebuild_provider_projection_for_location(uuid) to authenticated;
grant execute on function public.rebuild_provider_projection_for_location(uuid) to service_role;

comment on function public.rebuild_provider_projection_for_location(uuid) is
  'Rebuild Nearby providers pin for one location. Callable by org managers or catalog staff.';
