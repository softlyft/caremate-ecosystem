-- Bidirectional patient ↔ provider connection requests.
-- initiated_by: which party created the pending row; the other party approves.

alter table public.patient_provider_connections
  add column if not exists initiated_by text not null default 'patient';

alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_initiated_by_check;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_initiated_by_check
  check (initiated_by in ('patient', 'provider'));

comment on column public.patient_provider_connections.initiated_by is
  'Who created the request: patient (provider approves in portal) or provider (patient approves in app).';

-- Staff may open an outbound request (by CareMate ID lookup via RPC below).
drop policy if exists "Provider staff insert org connections"
  on public.patient_provider_connections;
create policy "Provider staff insert org connections"
  on public.patient_provider_connections for insert to authenticated
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

-- Patients may log connection activity on their own timeline.
drop policy if exists "Patients insert own activities"
  on public.patient_provider_activities;
create policy "Patients insert own activities"
  on public.patient_provider_activities for insert to authenticated
  with check (patient_id = auth.uid());

-- ========== Provider → patient (CareMate ID) ==========
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
    end if;

    update public.patient_provider_connections
    set
      status = 'pending',
      initiated_by = 'provider',
      provider_note = nullif(btrim(coalesce(p_provider_note, '')), ''),
      patient_note = null,
      approved_at = null,
      rejected_at = null,
      updated_at = now()
    where id = v_existing.id
    returning * into v_row;
  else
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
  end if;

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

comment on function public.request_provider_connection_by_caremate_id is
  'Org staff request a pending connection by CareMate Patient ID (profiles.patient_id).';

-- ========== Patient → provider (from Nearby detail) ==========
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

  select * into v_existing
  from public.patient_provider_connections c
  where c.patient_id = v_user_id
    and c.organization_id = p_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'You are already connected with this provider';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    end if;

    update public.patient_provider_connections
    set
      status = 'pending',
      initiated_by = 'patient',
      patient_note = nullif(btrim(coalesce(p_patient_note, '')), ''),
      provider_note = null,
      approved_at = null,
      rejected_at = null,
      updated_at = now()
    where id = v_existing.id
    returning * into v_row;
  else
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
  end if;

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

comment on function public.request_patient_provider_connection is
  'Authenticated patient opens a pending connection with a catalog organization.';

grant execute on function public.request_provider_connection_by_caremate_id(uuid, text, text)
  to authenticated;
grant execute on function public.request_patient_provider_connection(uuid, text)
  to authenticated;
