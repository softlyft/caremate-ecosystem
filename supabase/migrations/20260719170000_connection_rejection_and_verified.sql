-- Rejection reason + single lifetime connection per patient/org + patient-readable verification.

alter table public.patient_provider_connections
  add column if not exists rejection_reason text;

comment on column public.patient_provider_connections.rejection_reason is
  'Required when status becomes rejected; set by the declining party.';

-- Patients may check whether a catalog org has completed claim verification.
create or replace function public.is_provider_org_verified(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_profiles pp
    where pp.organization_id = p_org_id
      and pp.verification_status = 'verified'
  );
$$;

grant execute on function public.is_provider_org_verified(uuid) to authenticated;

-- Orgs that already completed claim (have an owner membership) are treated as verified.
update public.provider_profiles pp
set verification_status = 'verified',
    updated_at = now()
where pp.verification_status is distinct from 'verified'
  and exists (
    select 1
    from public.provider_org_members m
    where m.organization_id = pp.organization_id
      and m.deleted_at is null
      and m.role = 'owner'
  );

-- ========== Provider → patient (CareMate ID) — one row forever ==========
create or replace function public.request_provider_connection_by_caremate_id(
  p_organization_id uuid,
  p_caremate_id text,
  p_provider_note text default null
)
returns public.patient_provider_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_user_id uuid;
  v_existing public.patient_provider_connections;
  v_row public.patient_provider_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_provider_org(p_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  v_digits := regexp_replace(coalesce(p_caremate_id, ''), '\s+', '', 'g');
  if v_digits !~ '^[0-9]{12}$' then
    raise exception 'Enter a valid 12-digit CareMate ID';
  end if;

  select p.user_id into v_user_id
  from public.profiles p
  where p.patient_id = v_digits
  limit 1;

  if v_user_id is null then
    raise exception 'No patient found with that CareMate ID';
  end if;

  select * into v_existing
  from public.patient_provider_connections c
  where c.patient_id = v_user_id
    and c.organization_id = p_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Patient is already connected';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    else
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    end if;
  end if;

  insert into public.patient_provider_connections (
    patient_id,
    organization_id,
    status,
    initiated_by,
    provider_note
  ) values (
    v_user_id,
    p_organization_id,
    'pending',
    'provider',
    nullif(btrim(coalesce(p_provider_note, '')), '')
  )
  returning * into v_row;

  insert into public.patient_provider_activities (
    organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    v_row.id,
    'connection_requested',
    'Provider requested connection',
    jsonb_build_object('initiated_by', 'provider')
  );

  return v_row;
end;
$$;

-- ========== Patient → provider — verified orgs only; one row forever ==========
create or replace function public.request_patient_provider_connection(
  p_organization_id uuid,
  p_patient_note text default null
)
returns public.patient_provider_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.patient_provider_connections;
  v_row public.patient_provider_connections;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_organization_id is null then
    raise exception 'Organization is required';
  end if;

  if not exists (
    select 1 from public.provider_organizations o where o.id = p_organization_id
  ) then
    raise exception 'Organization not found';
  end if;

  if not public.is_provider_org_verified(p_organization_id) then
    raise exception 'This provider is not verified yet';
  end if;

  select * into v_existing
  from public.patient_provider_connections c
  where c.patient_id = v_user_id
    and c.organization_id = p_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'You are already connected with this provider';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    else
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    end if;
  end if;

  insert into public.patient_provider_connections (
    patient_id,
    organization_id,
    status,
    initiated_by,
    patient_note
  ) values (
    v_user_id,
    p_organization_id,
    'pending',
    'patient',
    nullif(btrim(coalesce(p_patient_note, '')), '')
  )
  returning * into v_row;

  insert into public.patient_provider_activities (
    organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    v_row.id,
    'connection_requested',
    'Patient requested connection',
    jsonb_build_object('initiated_by', 'patient')
  );

  return v_row;
end;
$$;
