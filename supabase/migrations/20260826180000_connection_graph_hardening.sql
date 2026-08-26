-- Connection graph hardening: full lifecycle (cancelled/disconnected), trigger-enforced
-- transitions, security-definer RPCs for respond/cancel/disconnect, and patient↔payer links.

-- =============================================================================
-- A. patient_provider_connections hardening
-- =============================================================================

-- Expand status lifecycle
alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_status_check;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'disconnected'));

alter table public.patient_provider_connections
  add column if not exists cancelled_at timestamptz,
  add column if not exists disconnected_at timestamptz,
  add column if not exists disconnected_by text;

alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_disconnected_by_check;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_disconnected_by_check
  check (disconnected_by is null or disconnected_by in ('patient', 'provider'));

alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_rejection_reason_chk;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_rejection_reason_chk
  check (
    status not in ('rejected', 'cancelled')
    or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
  );

comment on column public.patient_provider_connections.cancelled_at is
  'Set when a pending request is withdrawn by the initiator.';
comment on column public.patient_provider_connections.disconnected_at is
  'Set when an approved connection is ended by either party.';
comment on column public.patient_provider_connections.disconnected_by is
  'Which party ended an approved connection: patient or provider.';

-- RLS: patients read-only; inserts via security-definer RPCs only
drop policy if exists "Patients manage own connection requests"
  on public.patient_provider_connections;

drop policy if exists "Provider staff insert org connections"
  on public.patient_provider_connections;

create policy "Patients read own connections"
  on public.patient_provider_connections for select to authenticated
  using (patient_id = auth.uid());

-- Provider staff read/update policies from 20260719140000 remain unchanged.

revoke all on public.patient_provider_connections from anon, authenticated;
grant select, update on public.patient_provider_connections to authenticated;
grant all on public.patient_provider_connections to service_role;

-- BEFORE UPDATE trigger: mirror provider↔payer rules with patient/provider parties
create or replace function public.enforce_patient_provider_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_patient boolean := auth.uid() = old.patient_id or public.is_admin();
  v_can_provider boolean := public.can_write_provider_org(old.organization_id) or public.is_admin();
begin
  -- RPC reopen path (cancelled/disconnected → pending)
  if current_setting('caremate.reopening_connection', true) = '1' then
    if old.status not in ('cancelled', 'disconnected') or new.status is distinct from 'pending' then
      raise exception 'Invalid reopen transition';
    end if;
    new.approved_at := null;
    new.rejected_at := null;
    new.cancelled_at := null;
    new.disconnected_at := null;
    new.disconnected_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- Immutable identity fields
  if new.patient_id is distinct from old.patient_id
    or new.organization_id is distinct from old.organization_id
    or new.initiated_by is distinct from old.initiated_by
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cannot change connection identity or initiated_by';
  end if;

  -- Approved → disconnected (either party)
  if old.status = 'approved' and new.status = 'disconnected' then
    if not (v_is_patient or v_can_provider) then
      raise exception 'Not authorized to disconnect this connection';
    end if;

    new.disconnected_at := coalesce(new.disconnected_at, now());
    if new.disconnected_by is null then
      new.disconnected_by := case
        when v_is_patient and not v_can_provider then 'patient'
        when v_can_provider and not v_is_patient then 'provider'
        when v_is_patient then 'patient'
        else 'provider'
      end;
    end if;

    new.updated_at := now();
    return new;
  end if;

  -- Terminal rows are immutable (reopen only via RPC flag above)
  if old.status in ('rejected', 'cancelled', 'disconnected') then
    raise exception 'Connection in terminal state cannot be updated';
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending or approved connections can be updated';
  end if;

  -- Pending note edits (status unchanged)
  if new.status = old.status then
    if not (v_is_patient or v_can_provider) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if new.status = 'approved' then
    if old.initiated_by = 'provider' then
      if not v_is_patient then
        raise exception 'Only the patient can approve this request';
      end if;
    elsif old.initiated_by = 'patient' then
      if not v_can_provider then
        raise exception 'Only provider staff can approve this request';
      end if;
    else
      raise exception 'Invalid initiated_by';
    end if;

    if new.rejection_reason is not null then
      raise exception 'Approved connections cannot include a rejection reason';
    end if;

    new.approved_at := coalesce(new.approved_at, now());
    new.rejected_at := null;
    new.cancelled_at := null;

  elsif new.status = 'rejected' then
    -- Opposite party only (initiator withdraws via cancelled)
    if old.initiated_by = 'provider' then
      if not v_is_patient then
        raise exception 'Only the patient can reject this request';
      end if;
    elsif old.initiated_by = 'patient' then
      if not v_can_provider then
        raise exception 'Only provider staff can reject this request';
      end if;
    else
      raise exception 'Invalid initiated_by';
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    new.rejected_at := coalesce(new.rejected_at, now());
    new.approved_at := null;
    new.cancelled_at := null;

  elsif new.status = 'cancelled' then
    -- Initiator only
    if old.initiated_by = 'patient' then
      if not v_is_patient then
        raise exception 'Only the initiator can cancel this request';
      end if;
    else
      if not v_can_provider then
        raise exception 'Only the initiator can cancel this request';
      end if;
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A cancellation reason is required';
    end if;

    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.approved_at := null;
    new.rejected_at := null;

  elsif new.status = 'pending' then
    raise exception 'Cannot revert connection to pending via direct update';
  else
    raise exception 'Invalid connection status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.enforce_patient_provider_connection_update() is
  'Connection graph hardening: immutable FKs/initiated_by, initiated_by approve rules, '
  'initiator-only cancel, either-party disconnect from approved, rejection_reason on reject/cancel.';

drop trigger if exists enforce_patient_provider_connection_update
  on public.patient_provider_connections;

create trigger enforce_patient_provider_connection_update
  before update on public.patient_provider_connections
  for each row
  execute function public.enforce_patient_provider_connection_update();

-- Purge messaging consent on reject, cancel, and disconnect
create or replace function public.connection_status_messaging_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.grant_messaging_consent_for_connection(new.id);
    elsif new.status in ('rejected', 'cancelled', 'disconnected') then
      perform public.purge_messaging_consent_for_connection(new.id);
    end if;
  end if;
  return new;
end;
$$;

comment on function public.connection_status_messaging_consent() is
  'Connection graph hardening: grant messaging consent on approve; purge on reject, cancel, or disconnect.';

-- ========== Request RPCs (reopen cancelled/disconnected; rejected is permanent) ==========

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

comment on function public.request_provider_connection_by_caremate_id(uuid, text, text) is
  'Connection graph hardening: org staff request by CareMate ID; reopens cancelled/disconnected rows; rejected is permanent.';

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
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.patient_provider_connections
      set
        status = 'pending',
        initiated_by = 'patient',
        patient_note = nullif(btrim(coalesce(p_patient_note, '')), ''),
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

comment on function public.request_patient_provider_connection(uuid, text) is
  'Connection graph hardening: patient opens pending request; reopens cancelled/disconnected; rejected is permanent.';

-- ========== Respond / cancel / disconnect RPCs ==========

create or replace function public.respond_patient_provider_connection(
  p_connection_id uuid,
  p_accept boolean,
  p_rejection_reason text default null,
  p_note text default null
)
returns public.patient_provider_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_provider_connections;
  v_row public.patient_provider_connections;
  v_is_patient boolean;
  v_can_provider boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_provider_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'pending' then
    raise exception 'Only pending connections can be responded to';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_provider := public.can_write_provider_org(v_conn.organization_id) or public.is_admin();

  -- Accepter must be opposite of initiator
  if v_conn.initiated_by = 'provider' then
    if not v_is_patient then
      raise exception 'Only the patient can respond to this request';
    end if;
  else
    if not v_can_provider then
      raise exception 'Only provider staff can respond to this request';
    end if;
  end if;

  if p_accept then
    update public.patient_provider_connections
    set
      status = 'approved',
      rejection_reason = null,
      approved_at = now(),
      rejected_at = null,
      cancelled_at = null,
      patient_note = case when v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else patient_note end,
      provider_note = case when v_can_provider and not v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else provider_note end,
      updated_at = now()
    where id = p_connection_id
    returning * into v_row;

    insert into public.patient_provider_activities (
      organization_id,
      patient_id,
      connection_id,
      event_type,
      summary,
      metadata
    ) values (
      v_conn.organization_id,
      v_conn.patient_id,
      v_row.id,
      'connection_approved',
      'Connection approved',
      jsonb_build_object('responded_by', case when v_is_patient then 'patient' else 'provider' end)
    );
  else
    if nullif(btrim(coalesce(p_rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    update public.patient_provider_connections
    set
      status = 'rejected',
      rejection_reason = nullif(btrim(p_rejection_reason), ''),
      rejected_at = now(),
      approved_at = null,
      cancelled_at = null,
      patient_note = case when v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else patient_note end,
      provider_note = case when v_can_provider and not v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else provider_note end,
      updated_at = now()
    where id = p_connection_id
    returning * into v_row;

    insert into public.patient_provider_activities (
      organization_id,
      patient_id,
      connection_id,
      event_type,
      summary,
      metadata
    ) values (
      v_conn.organization_id,
      v_conn.patient_id,
      v_row.id,
      'connection_rejected',
      'Connection rejected',
      jsonb_build_object(
        'responded_by', case when v_is_patient then 'patient' else 'provider' end,
        'reason', v_row.rejection_reason
      )
    );
  end if;

  return v_row;
end;
$$;

comment on function public.respond_patient_provider_connection(uuid, boolean, text, text) is
  'Connection graph hardening: non-initiator accepts or rejects a pending patient↔provider request.';

create or replace function public.cancel_pending_patient_provider_connection(
  p_connection_id uuid,
  p_reason text
)
returns public.patient_provider_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_provider_connections;
  v_row public.patient_provider_connections;
  v_is_patient boolean;
  v_can_provider boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_provider_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'pending' then
    raise exception 'Only pending connections can be cancelled';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_provider := public.can_write_provider_org(v_conn.organization_id) or public.is_admin();

  if v_conn.initiated_by = 'patient' then
    if not v_is_patient then
      raise exception 'Only the initiator can cancel this request';
    end if;
  else
    if not v_can_provider then
      raise exception 'Only the initiator can cancel this request';
    end if;
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'A cancellation reason is required';
  end if;

  update public.patient_provider_connections
  set
    status = 'cancelled',
    rejection_reason = nullif(btrim(p_reason), ''),
    cancelled_at = now(),
    approved_at = null,
    rejected_at = null,
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  insert into public.patient_provider_activities (
    organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    v_conn.organization_id,
    v_conn.patient_id,
    v_row.id,
    'connection_cancelled',
    'Connection request cancelled',
    jsonb_build_object(
      'initiated_by', v_conn.initiated_by,
      'reason', v_row.rejection_reason
    )
  );

  return v_row;
end;
$$;

comment on function public.cancel_pending_patient_provider_connection(uuid, text) is
  'Connection graph hardening: initiator withdraws a pending patient↔provider request.';

create or replace function public.disconnect_patient_provider_connection(
  p_connection_id uuid,
  p_reason text default null
)
returns public.patient_provider_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_provider_connections;
  v_row public.patient_provider_connections;
  v_is_patient boolean;
  v_can_provider boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_provider_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'approved' then
    raise exception 'Only approved connections can be disconnected';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_provider := public.can_write_provider_org(v_conn.organization_id) or public.is_admin();

  if not (v_is_patient or v_can_provider) then
    raise exception 'Not authorized to disconnect this connection';
  end if;

  update public.patient_provider_connections
  set
    status = 'disconnected',
    rejection_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    disconnected_at = now(),
    disconnected_by = case
      when v_is_patient and not v_can_provider then 'patient'
      when v_can_provider and not v_is_patient then 'provider'
      when v_is_patient then 'patient'
      else 'provider'
    end,
    shared_scopes = array['basic']::text[],
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  insert into public.patient_provider_activities (
    organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    v_conn.organization_id,
    v_conn.patient_id,
    v_row.id,
    'connection_disconnected',
    'Connection ended',
    jsonb_build_object(
      'disconnected_by', v_row.disconnected_by,
      'reason', v_row.rejection_reason
    )
  );

  return v_row;
end;
$$;

comment on function public.disconnect_patient_provider_connection(uuid, text) is
  'Connection graph hardening: either party ends an approved connection; resets shared_scopes to basic.';

grant execute on function public.respond_patient_provider_connection(uuid, boolean, text, text) to authenticated;
grant execute on function public.cancel_pending_patient_provider_connection(uuid, text) to authenticated;
grant execute on function public.disconnect_patient_provider_connection(uuid, text) to authenticated;

-- =============================================================================
-- B. provider_payer_connections hardening
-- =============================================================================

alter table public.provider_payer_connections
  drop constraint if exists provider_payer_connections_status_check;

alter table public.provider_payer_connections
  add constraint provider_payer_connections_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'disconnected'));

alter table public.provider_payer_connections
  add column if not exists cancelled_at timestamptz,
  add column if not exists disconnected_at timestamptz,
  add column if not exists disconnected_by text;

alter table public.provider_payer_connections
  drop constraint if exists provider_payer_connections_disconnected_by_check;

alter table public.provider_payer_connections
  add constraint provider_payer_connections_disconnected_by_check
  check (disconnected_by is null or disconnected_by in ('provider', 'payer'));

alter table public.provider_payer_connections
  drop constraint if exists provider_payer_connections_rejection_reason_chk;

alter table public.provider_payer_connections
  add constraint provider_payer_connections_rejection_reason_chk
  check (
    status not in ('rejected', 'cancelled')
    or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
  );

comment on column public.provider_payer_connections.cancelled_at is
  'Set when a pending B2B request is withdrawn by the initiator.';
comment on column public.provider_payer_connections.disconnected_at is
  'Set when an approved provider↔payer link is ended.';
comment on column public.provider_payer_connections.disconnected_by is
  'Which party ended an approved connection: provider or payer.';

create or replace function public.enforce_provider_payer_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_provider boolean := public.can_write_provider_org(old.provider_organization_id) or public.is_admin();
  v_can_payer boolean := public.can_write_payer_org(old.payer_organization_id) or public.is_admin();
begin
  if current_setting('caremate.reopening_connection', true) = '1' then
    if old.status not in ('cancelled', 'disconnected') or new.status is distinct from 'pending' then
      raise exception 'Invalid reopen transition';
    end if;
    new.approved_at := null;
    new.rejected_at := null;
    new.cancelled_at := null;
    new.disconnected_at := null;
    new.disconnected_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.provider_organization_id is distinct from old.provider_organization_id
    or new.payer_organization_id is distinct from old.payer_organization_id
    or new.initiated_by is distinct from old.initiated_by
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cannot change provider/payer identity or initiated_by on a connection';
  end if;

  -- Approved → disconnected (either write side)
  if old.status = 'approved' and new.status = 'disconnected' then
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to disconnect this connection';
    end if;

    new.disconnected_at := coalesce(new.disconnected_at, now());
    if new.disconnected_by is null then
      new.disconnected_by := case
        when v_can_provider and not v_can_payer then 'provider'
        when v_can_payer and not v_can_provider then 'payer'
        when v_can_payer then 'payer'
        else 'provider'
      end;
    end if;

    new.updated_at := now();
    return new;
  end if;

  if old.status in ('rejected', 'cancelled', 'disconnected') then
    raise exception 'Connection in terminal state cannot be updated';
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending or approved connections can be updated';
  end if;

  if new.status = old.status then
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if new.status = 'approved' then
    if old.initiated_by = 'provider' then
      if not v_can_payer then
        raise exception 'Only the payer organization can approve this request';
      end if;
    elsif old.initiated_by = 'payer' then
      if not v_can_provider then
        raise exception 'Only the provider organization can approve this request';
      end if;
    else
      raise exception 'Invalid initiated_by';
    end if;

    if new.rejection_reason is not null then
      raise exception 'Approved connections cannot include a rejection reason';
    end if;

    new.approved_at := coalesce(new.approved_at, now());
    new.rejected_at := null;
    new.cancelled_at := null;

  elsif new.status = 'rejected' then
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to reject this connection';
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    new.rejected_at := coalesce(new.rejected_at, now());
    new.approved_at := null;
    new.cancelled_at := null;

  elsif new.status = 'cancelled' then
    if old.initiated_by = 'provider' then
      if not v_can_provider then
        raise exception 'Only the initiator can cancel this request';
      end if;
    else
      if not v_can_payer then
        raise exception 'Only the initiator can cancel this request';
      end if;
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A cancellation reason is required';
    end if;

    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.approved_at := null;
    new.rejected_at := null;

  elsif new.status = 'pending' then
    raise exception 'Cannot revert connection to pending via direct update';
  else
    raise exception 'Invalid connection status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.enforce_provider_payer_connection_update() is
  'Connection graph hardening: initiated_by approve rules, initiator-only cancel, '
  'either-party disconnect from approved, rejection_reason on reject/cancel.';

drop trigger if exists enforce_provider_payer_connection_update
  on public.provider_payer_connections;

create trigger enforce_provider_payer_connection_update
  before update on public.provider_payer_connections
  for each row
  execute function public.enforce_provider_payer_connection_update();

-- ========== Request RPCs (reopen cancelled/disconnected) ==========

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

comment on function public.request_provider_payer_connection_by_email(uuid, text, text) is
  'Connection graph hardening: provider requests payer link; reopens cancelled/disconnected; rejected is permanent.';

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

comment on function public.request_payer_provider_connection_by_email(uuid, text, text) is
  'Connection graph hardening: payer requests provider link; reopens cancelled/disconnected; rejected is permanent.';

create or replace function public.cancel_pending_provider_payer_connection(
  p_connection_id uuid,
  p_reason text
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.provider_payer_connections;
  v_row public.provider_payer_connections;
  v_can_provider boolean;
  v_can_payer boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.provider_payer_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'pending' then
    raise exception 'Only pending connections can be cancelled';
  end if;

  v_can_provider := public.can_write_provider_org(v_conn.provider_organization_id) or public.is_admin();
  v_can_payer := public.can_write_payer_org(v_conn.payer_organization_id) or public.is_admin();

  if v_conn.initiated_by = 'provider' then
    if not v_can_provider then
      raise exception 'Only the initiator can cancel this request';
    end if;
  else
    if not v_can_payer then
      raise exception 'Only the initiator can cancel this request';
    end if;
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'A cancellation reason is required';
  end if;

  update public.provider_payer_connections
  set
    status = 'cancelled',
    rejection_reason = nullif(btrim(p_reason), ''),
    cancelled_at = now(),
    approved_at = null,
    rejected_at = null,
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.cancel_pending_provider_payer_connection(uuid, text) is
  'Connection graph hardening: initiator withdraws a pending provider↔payer request.';

create or replace function public.disconnect_provider_payer_connection(
  p_connection_id uuid,
  p_reason text default null
)
returns public.provider_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.provider_payer_connections;
  v_row public.provider_payer_connections;
  v_can_provider boolean;
  v_can_payer boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.provider_payer_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'approved' then
    raise exception 'Only approved connections can be disconnected';
  end if;

  v_can_provider := public.can_write_provider_org(v_conn.provider_organization_id) or public.is_admin();
  v_can_payer := public.can_write_payer_org(v_conn.payer_organization_id) or public.is_admin();

  if not (v_can_provider or v_can_payer) then
    raise exception 'Not authorized to disconnect this connection';
  end if;

  update public.provider_payer_connections
  set
    status = 'disconnected',
    rejection_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    disconnected_at = now(),
    disconnected_by = case
      when v_can_provider and not v_can_payer then 'provider'
      when v_can_payer and not v_can_provider then 'payer'
      when v_can_payer then 'payer'
      else 'provider'
    end,
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.disconnect_provider_payer_connection(uuid, text) is
  'Connection graph hardening: either B2B party ends an approved provider↔payer link.';

grant execute on function public.cancel_pending_provider_payer_connection(uuid, text) to authenticated;
grant execute on function public.disconnect_provider_payer_connection(uuid, text) to authenticated;

-- =============================================================================
-- C. patient_payer_connections (new)
-- =============================================================================

create table if not exists public.patient_payer_connections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  payer_organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'disconnected')),
  initiated_by text not null
    check (initiated_by in ('patient', 'payer')),
  patient_note text,
  payer_note text,
  rejection_reason text,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  disconnected_at timestamptz,
  disconnected_by text
    check (disconnected_by is null or disconnected_by in ('patient', 'payer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, payer_organization_id),
  constraint patient_payer_connections_rejection_reason_chk
    check (
      status not in ('rejected', 'cancelled')
      or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
    )
);

create index if not exists patient_payer_connections_patient_idx
  on public.patient_payer_connections (patient_id, status);

create index if not exists patient_payer_connections_payer_idx
  on public.patient_payer_connections (payer_organization_id, status);

comment on table public.patient_payer_connections is
  'Patient↔payer organization links. One row per pair for life; cancelled/disconnected may reopen via RPC.';

drop trigger if exists patient_payer_connections_set_updated_at
  on public.patient_payer_connections;

create trigger patient_payer_connections_set_updated_at
  before update on public.patient_payer_connections
  for each row execute function public.set_updated_at();

alter table public.patient_payer_connections enable row level security;

revoke all on public.patient_payer_connections from anon, authenticated;
grant select, update on public.patient_payer_connections to authenticated;
grant all on public.patient_payer_connections to service_role;

create policy "Patients read own payer connections"
  on public.patient_payer_connections for select to authenticated
  using (patient_id = auth.uid());

create policy "Payer members read patient-payer connections"
  on public.patient_payer_connections for select to authenticated
  using (
    public.is_payer_org_member(payer_organization_id)
    or public.is_staff()
  );

create policy "Payer writers update patient-payer connections"
  on public.patient_payer_connections for update to authenticated
  using (
    public.can_write_payer_org(payer_organization_id)
    or public.is_admin()
  )
  with check (
    public.can_write_payer_org(payer_organization_id)
    or public.is_admin()
  );

-- ========== Activity timeline ==========

create table if not exists public.patient_payer_activities (
  id uuid primary key default gen_random_uuid(),
  payer_organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.patient_payer_connections (id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patient_payer_activities_payer_created_idx
  on public.patient_payer_activities (payer_organization_id, created_at desc);

create index if not exists patient_payer_activities_patient_idx
  on public.patient_payer_activities (patient_id, created_at desc);

comment on table public.patient_payer_activities is
  'Audit trail for patient↔payer connection lifecycle events.';

alter table public.patient_payer_activities enable row level security;

revoke all on public.patient_payer_activities from anon, authenticated;
grant select on public.patient_payer_activities to authenticated;
grant all on public.patient_payer_activities to service_role;

create policy "Patients read own payer activities"
  on public.patient_payer_activities for select to authenticated
  using (patient_id = auth.uid());

create policy "Payer members read org payer activities"
  on public.patient_payer_activities for select to authenticated
  using (
    public.is_payer_org_member(payer_organization_id)
    or public.is_staff()
  );

-- ========== Trigger ==========

create or replace function public.enforce_patient_payer_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_patient boolean := auth.uid() = old.patient_id or public.is_admin();
  v_can_payer boolean := public.can_write_payer_org(old.payer_organization_id) or public.is_admin();
begin
  if current_setting('caremate.reopening_connection', true) = '1' then
    if old.status not in ('cancelled', 'disconnected') or new.status is distinct from 'pending' then
      raise exception 'Invalid reopen transition';
    end if;
    new.approved_at := null;
    new.rejected_at := null;
    new.cancelled_at := null;
    new.disconnected_at := null;
    new.disconnected_by := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.patient_id is distinct from old.patient_id
    or new.payer_organization_id is distinct from old.payer_organization_id
    or new.initiated_by is distinct from old.initiated_by
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cannot change connection identity or initiated_by';
  end if;

  if old.status = 'approved' and new.status = 'disconnected' then
    if not (v_is_patient or v_can_payer) then
      raise exception 'Not authorized to disconnect this connection';
    end if;

    new.disconnected_at := coalesce(new.disconnected_at, now());
    if new.disconnected_by is null then
      new.disconnected_by := case
        when v_is_patient and not v_can_payer then 'patient'
        when v_can_payer and not v_is_patient then 'payer'
        when v_is_patient then 'patient'
        else 'payer'
      end;
    end if;

    new.updated_at := now();
    return new;
  end if;

  if old.status in ('rejected', 'cancelled', 'disconnected') then
    raise exception 'Connection in terminal state cannot be updated';
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending or approved connections can be updated';
  end if;

  if new.status = old.status then
    if not (v_is_patient or v_can_payer) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if new.status = 'approved' then
    if old.initiated_by = 'payer' then
      if not v_is_patient then
        raise exception 'Only the patient can approve this request';
      end if;
    elsif old.initiated_by = 'patient' then
      if not v_can_payer then
        raise exception 'Only payer staff can approve this request';
      end if;
    else
      raise exception 'Invalid initiated_by';
    end if;

    if new.rejection_reason is not null then
      raise exception 'Approved connections cannot include a rejection reason';
    end if;

    new.approved_at := coalesce(new.approved_at, now());
    new.rejected_at := null;
    new.cancelled_at := null;

  elsif new.status = 'rejected' then
    if not (v_is_patient or v_can_payer) then
      raise exception 'Not authorized to reject this connection';
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    new.rejected_at := coalesce(new.rejected_at, now());
    new.approved_at := null;
    new.cancelled_at := null;

  elsif new.status = 'cancelled' then
    if old.initiated_by = 'patient' then
      if not v_is_patient then
        raise exception 'Only the initiator can cancel this request';
      end if;
    else
      if not v_can_payer then
        raise exception 'Only the initiator can cancel this request';
      end if;
    end if;

    if nullif(btrim(coalesce(new.rejection_reason, '')), '') is null then
      raise exception 'A cancellation reason is required';
    end if;

    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.approved_at := null;
    new.rejected_at := null;

  elsif new.status = 'pending' then
    raise exception 'Cannot revert connection to pending via direct update';
  else
    raise exception 'Invalid connection status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.enforce_patient_payer_connection_update() is
  'Connection graph hardening: patient↔payer lifecycle rules mirroring patient↔provider links.';

drop trigger if exists enforce_patient_payer_connection_update
  on public.patient_payer_connections;

create trigger enforce_patient_payer_connection_update
  before update on public.patient_payer_connections
  for each row
  execute function public.enforce_patient_payer_connection_update();

-- ========== patient↔payer RPCs ==========

create or replace function public.request_patient_payer_connection(
  p_payer_organization_id uuid,
  p_patient_note text default null
)
returns public.patient_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.patient_payer_connections;
  v_row public.patient_payer_connections;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_payer_organization_id is null then
    raise exception 'Payer organization is required';
  end if;

  if not public.is_payer_org_verified(p_payer_organization_id) then
    raise exception 'This payer is not verified yet';
  end if;

  select * into v_existing
  from public.patient_payer_connections c
  where c.patient_id = v_user_id
    and c.payer_organization_id = p_payer_organization_id;

  if found then
    if v_existing.status = 'approved' then
      raise exception 'You are already connected with this payer';
    elsif v_existing.status = 'pending' then
      raise exception 'A connection request is already pending';
    elsif v_existing.status = 'rejected' then
      raise exception 'A previous connection request was declined. Multiple requests are not allowed.';
    elsif v_existing.status in ('cancelled', 'disconnected') then
      perform set_config('caremate.reopening_connection', '1', true);

      update public.patient_payer_connections
      set
        status = 'pending',
        initiated_by = 'patient',
        patient_note = nullif(btrim(coalesce(p_patient_note, '')), ''),
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
    insert into public.patient_payer_connections (
      patient_id,
      payer_organization_id,
      status,
      initiated_by,
      patient_note
    ) values (
      v_user_id,
      p_payer_organization_id,
      'pending',
      'patient',
      nullif(btrim(coalesce(p_patient_note, '')), '')
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
    'Patient requested payer connection',
    jsonb_build_object('initiated_by', 'patient')
  );

  return v_row;
end;
$$;

comment on function public.request_patient_payer_connection(uuid, text) is
  'Connection graph hardening: patient requests link to verified payer org; reopens cancelled/disconnected.';

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

comment on function public.request_payer_patient_connection_by_caremate_id(uuid, text, text) is
  'Connection graph hardening: payer staff requests patient link by CareMate ID; reopens cancelled/disconnected.';

create or replace function public.respond_patient_payer_connection(
  p_connection_id uuid,
  p_accept boolean,
  p_rejection_reason text default null,
  p_note text default null
)
returns public.patient_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_payer_connections;
  v_row public.patient_payer_connections;
  v_is_patient boolean;
  v_can_payer boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_payer_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'pending' then
    raise exception 'Only pending connections can be responded to';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_payer := public.can_write_payer_org(v_conn.payer_organization_id) or public.is_admin();

  if v_conn.initiated_by = 'payer' then
    if not v_is_patient then
      raise exception 'Only the patient can respond to this request';
    end if;
  else
    if not v_can_payer then
      raise exception 'Only payer staff can respond to this request';
    end if;
  end if;

  if p_accept then
    update public.patient_payer_connections
    set
      status = 'approved',
      rejection_reason = null,
      approved_at = now(),
      rejected_at = null,
      cancelled_at = null,
      patient_note = case when v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else patient_note end,
      payer_note = case when v_can_payer and not v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else payer_note end,
      updated_at = now()
    where id = p_connection_id
    returning * into v_row;

    insert into public.patient_payer_activities (
      payer_organization_id,
      patient_id,
      connection_id,
      event_type,
      summary,
      metadata
    ) values (
      v_conn.payer_organization_id,
      v_conn.patient_id,
      v_row.id,
      'connection_approved',
      'Connection approved',
      jsonb_build_object('responded_by', case when v_is_patient then 'patient' else 'payer' end)
    );
  else
    if nullif(btrim(coalesce(p_rejection_reason, '')), '') is null then
      raise exception 'A rejection reason is required';
    end if;

    update public.patient_payer_connections
    set
      status = 'rejected',
      rejection_reason = nullif(btrim(p_rejection_reason), ''),
      rejected_at = now(),
      approved_at = null,
      cancelled_at = null,
      patient_note = case when v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else patient_note end,
      payer_note = case when v_can_payer and not v_is_patient then nullif(btrim(coalesce(p_note, '')), '') else payer_note end,
      updated_at = now()
    where id = p_connection_id
    returning * into v_row;

    insert into public.patient_payer_activities (
      payer_organization_id,
      patient_id,
      connection_id,
      event_type,
      summary,
      metadata
    ) values (
      v_conn.payer_organization_id,
      v_conn.patient_id,
      v_row.id,
      'connection_rejected',
      'Connection rejected',
      jsonb_build_object(
        'responded_by', case when v_is_patient then 'patient' else 'payer' end,
        'reason', v_row.rejection_reason
      )
    );
  end if;

  return v_row;
end;
$$;

comment on function public.respond_patient_payer_connection(uuid, boolean, text, text) is
  'Connection graph hardening: non-initiator accepts or rejects a pending patient↔payer request.';

create or replace function public.cancel_pending_patient_payer_connection(
  p_connection_id uuid,
  p_reason text
)
returns public.patient_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_payer_connections;
  v_row public.patient_payer_connections;
  v_is_patient boolean;
  v_can_payer boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_payer_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'pending' then
    raise exception 'Only pending connections can be cancelled';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_payer := public.can_write_payer_org(v_conn.payer_organization_id) or public.is_admin();

  if v_conn.initiated_by = 'patient' then
    if not v_is_patient then
      raise exception 'Only the initiator can cancel this request';
    end if;
  else
    if not v_can_payer then
      raise exception 'Only the initiator can cancel this request';
    end if;
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'A cancellation reason is required';
  end if;

  update public.patient_payer_connections
  set
    status = 'cancelled',
    rejection_reason = nullif(btrim(p_reason), ''),
    cancelled_at = now(),
    approved_at = null,
    rejected_at = null,
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  insert into public.patient_payer_activities (
    payer_organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    v_conn.payer_organization_id,
    v_conn.patient_id,
    v_row.id,
    'connection_cancelled',
    'Connection request cancelled',
    jsonb_build_object(
      'initiated_by', v_conn.initiated_by,
      'reason', v_row.rejection_reason
    )
  );

  return v_row;
end;
$$;

comment on function public.cancel_pending_patient_payer_connection(uuid, text) is
  'Connection graph hardening: initiator withdraws a pending patient↔payer request.';

create or replace function public.disconnect_patient_payer_connection(
  p_connection_id uuid,
  p_reason text default null
)
returns public.patient_payer_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn public.patient_payer_connections;
  v_row public.patient_payer_connections;
  v_is_patient boolean;
  v_can_payer boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_conn
  from public.patient_payer_connections
  where id = p_connection_id;

  if not found then
    raise exception 'Connection not found';
  end if;

  if v_conn.status is distinct from 'approved' then
    raise exception 'Only approved connections can be disconnected';
  end if;

  v_is_patient := auth.uid() = v_conn.patient_id or public.is_admin();
  v_can_payer := public.can_write_payer_org(v_conn.payer_organization_id) or public.is_admin();

  if not (v_is_patient or v_can_payer) then
    raise exception 'Not authorized to disconnect this connection';
  end if;

  update public.patient_payer_connections
  set
    status = 'disconnected',
    rejection_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    disconnected_at = now(),
    disconnected_by = case
      when v_is_patient and not v_can_payer then 'patient'
      when v_can_payer and not v_is_patient then 'payer'
      when v_is_patient then 'patient'
      else 'payer'
    end,
    updated_at = now()
  where id = p_connection_id
  returning * into v_row;

  insert into public.patient_payer_activities (
    payer_organization_id,
    patient_id,
    connection_id,
    event_type,
    summary,
    metadata
  ) values (
    v_conn.payer_organization_id,
    v_conn.patient_id,
    v_row.id,
    'connection_disconnected',
    'Connection ended',
    jsonb_build_object(
      'disconnected_by', v_row.disconnected_by,
      'reason', v_row.rejection_reason
    )
  );

  return v_row;
end;
$$;

comment on function public.disconnect_patient_payer_connection(uuid, text) is
  'Connection graph hardening: either party ends an approved patient↔payer link.';

grant execute on function public.request_patient_payer_connection(uuid, text) to authenticated;
grant execute on function public.request_payer_patient_connection_by_caremate_id(uuid, text, text) to authenticated;
grant execute on function public.respond_patient_payer_connection(uuid, boolean, text, text) to authenticated;
grant execute on function public.cancel_pending_patient_payer_connection(uuid, text) to authenticated;
grant execute on function public.disconnect_patient_payer_connection(uuid, text) to authenticated;
