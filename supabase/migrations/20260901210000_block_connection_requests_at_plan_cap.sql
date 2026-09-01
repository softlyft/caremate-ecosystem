-- Block org-initiated connection requests when the organization is at its plan cap
-- (mirrors Care Portal UI gating on request pages).

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

  if not public.is_admin()
    and not public.provider_org_can_approve_patient(p_organization_id) then
    raise exception
      'Patient connection limit reached for this organization plan. Upgrade Private Care Team to connect more patients.';
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
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.patient_provider_connections
      set
        status = 'pending',
        initiated_by = 'provider',
        provider_note = nullif(btrim(coalesce(p_provider_note, '')), ''),
        patient_note = null,
        approved_at = null,
        rejected_at = null,
        cancelled_at = null,
        disconnected_at = null,
        disconnected_by = null,
        rejection_reason = null,
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;

      perform set_config('caremate.reopening_connection', '0', true);
    else
      raise exception 'Unexpected connection status';
    end if;
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

create or replace function public.request_payer_patient_connection_by_caremate_id(
  p_payer_organization_id uuid,
  p_caremate_id text,
  p_payer_note text default null
)
returns public.patient_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_user_id uuid;
  v_existing public.patient_payer_connections;
  v_row public.patient_payer_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_payer_org(p_payer_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if not public.is_payer_org_verified(p_payer_organization_id) then
    raise exception 'Your organization must be verified before connecting';
  end if;

  if not public.is_admin()
    and not public.payer_org_can_approve_patient(p_payer_organization_id) then
    raise exception
      'Patient connection limit reached for this organization plan. Upgrade Support Team to connect more patients.';
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
  from public.patient_payer_connections c
  where c.patient_id = v_user_id
    and c.payer_organization_id = p_payer_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Patient is already connected';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.patient_payer_connections
      set
        status = 'pending',
        initiated_by = 'payer',
        payer_note = nullif(btrim(coalesce(p_payer_note, '')), ''),
        patient_note = null,
        approved_at = null,
        rejected_at = null,
        cancelled_at = null,
        disconnected_at = null,
        disconnected_by = null,
        rejection_reason = null,
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;

      perform set_config('caremate.reopening_connection', '0', true);
    else
      raise exception 'Unexpected connection status';
    end if;
  else
    insert into public.patient_payer_connections (
      patient_id,
      payer_organization_id,
      status,
      initiated_by,
      payer_note
    ) values (
      v_user_id,
      p_payer_organization_id,
      'pending',
      'payer',
      nullif(btrim(coalesce(p_payer_note, '')), '')
    )
    returning * into v_row;
  end if;

  insert into public.patient_payer_activities (
    payer_organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    p_payer_organization_id,
    v_user_id,
    v_row.id,
    'connection_requested',
    'Payer requested patient connection',
    jsonb_build_object('initiated_by', 'payer')
  );

  return v_row;
end;
$$;

create or replace function public.request_provider_payer_connection_by_email(
  p_provider_organization_id uuid,
  p_payer_claim_email text,
  p_provider_note text default null
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
  v_existing public.provider_payer_connections;
  v_row public.provider_payer_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_provider_org(p_provider_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if not public.is_provider_org_verified(p_provider_organization_id) then
    raise exception 'Your organization must be verified before connecting';
  end if;

  if not public.is_admin()
    and not public.provider_org_can_approve_payer_connection(p_provider_organization_id) then
    raise exception 'Provider payer connection limit reached (%). Upgrade the organization plan.',
      public.provider_org_payer_connection_cap(p_provider_organization_id);
  end if;

  v_payer_id := public.find_verified_payer_org_id_by_claim_email(p_payer_claim_email);
  if v_payer_id is null then
    raise exception 'No verified payer found with that claim contact email';
  end if;

  select * into v_existing
  from public.provider_payer_connections c
  where c.provider_organization_id = p_provider_organization_id
    and c.payer_organization_id = v_payer_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Already connected with this payer';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.provider_payer_connections
      set
        status = 'pending',
        initiated_by = 'provider',
        provider_note = nullif(btrim(coalesce(p_provider_note, '')), ''),
        payer_note = null,
        approved_at = null,
        rejected_at = null,
        cancelled_at = null,
        disconnected_at = null,
        disconnected_by = null,
        rejection_reason = null,
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;

      perform set_config('caremate.reopening_connection', '0', true);
    else
      raise exception 'Unexpected connection status';
    end if;
  else
    insert into public.provider_payer_connections (
      provider_organization_id,
      payer_organization_id,
      status,
      initiated_by,
      provider_note
    ) values (
      p_provider_organization_id,
      v_payer_id,
      'pending',
      'provider',
      nullif(btrim(coalesce(p_provider_note, '')), '')
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.request_payer_provider_connection_by_email(
  p_payer_organization_id uuid,
  p_provider_claim_email text,
  p_payer_note text default null
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id uuid;
  v_existing public.provider_payer_connections;
  v_row public.provider_payer_connections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.can_write_payer_org(p_payer_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if not public.is_payer_org_verified(p_payer_organization_id) then
    raise exception 'Your organization must be verified before connecting';
  end if;

  if not public.is_admin()
    and not public.payer_org_can_approve_provider_connection(p_payer_organization_id) then
    raise exception 'Payer provider connection limit reached (%). Upgrade the organization plan.',
      public.payer_org_provider_connection_cap(p_payer_organization_id);
  end if;

  v_provider_id := public.find_verified_provider_org_id_by_claim_email(p_provider_claim_email);
  if v_provider_id is null then
    raise exception 'No verified provider found with that claim contact email';
  end if;

  select * into v_existing
  from public.provider_payer_connections c
  where c.provider_organization_id = v_provider_id
    and c.payer_organization_id = p_payer_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'Already connected with this provider';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.provider_payer_connections
      set
        status = 'pending',
        initiated_by = 'payer',
        payer_note = nullif(btrim(coalesce(p_payer_note, '')), ''),
        provider_note = null,
        approved_at = null,
        rejected_at = null,
        cancelled_at = null,
        disconnected_at = null,
        disconnected_by = null,
        rejection_reason = null,
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;

      perform set_config('caremate.reopening_connection', '0', true);
    else
      raise exception 'Unexpected connection status';
    end if;
  else
    insert into public.provider_payer_connections (
      provider_organization_id,
      payer_organization_id,
      status,
      initiated_by,
      payer_note
    ) values (
      v_provider_id,
      p_payer_organization_id,
      'pending',
      'payer',
      nullif(btrim(coalesce(p_payer_note, '')), '')
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;
