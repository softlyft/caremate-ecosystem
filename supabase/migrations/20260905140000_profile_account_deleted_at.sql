-- Account deletion deidentification: tombstone profiles + allow service-role
-- connection teardown during delete-account without rewriting every RPC.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

comment on column public.profiles.deleted_at is
  'Set when the patient deletes their CareMate account. Identity fields are scrubbed; row kept so org messaging/history can show Deleted user.';

create or replace function public.is_deleted_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.deleted_at is not null
  );
$$;

revoke all on function public.is_deleted_user(uuid) from public;
grant execute on function public.is_deleted_user(uuid) to authenticated, service_role;

comment on function public.is_deleted_user(uuid) is
  'True when profiles.deleted_at is set for the given auth user (account deidentified).';

-- Allow service-role account delete to end patient↔org links.
create or replace function public.enforce_patient_provider_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_patient boolean := auth.uid() = old.patient_id or public.is_admin();
  v_can_provider boolean := public.can_write_provider_org(old.organization_id) or public.is_admin();
  v_account_deleting boolean := current_setting('caremate.account_deleting', true) = '1';
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

  if current_setting('caremate.syncing_shared_scopes', true) = '1' then
    return new;
  end if;

  if v_account_deleting then
    if old.status = 'approved' and new.status = 'disconnected' then
      new.disconnected_at := coalesce(new.disconnected_at, now());
      new.disconnected_by := coalesce(new.disconnected_by, 'patient');
      new.updated_at := now();
      return new;
    end if;
    if old.status = 'pending' and new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
      new.rejection_reason := coalesce(
        nullif(btrim(coalesce(new.rejection_reason, '')), ''),
        'Account deleted'
      );
      new.approved_at := null;
      new.rejected_at := null;
      new.updated_at := now();
      return new;
    end if;
  end if;

  if new.patient_id is distinct from old.patient_id
    or new.organization_id is distinct from old.organization_id
    or new.initiated_by is distinct from old.initiated_by
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cannot change connection identity or initiated_by';
  end if;

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

  if old.status in ('rejected', 'cancelled', 'disconnected') then
    raise exception 'Connection in terminal state cannot be updated';
  end if;

  if new.status = old.status then
    if not (v_is_patient or v_can_provider) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending connections can change status';
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

create or replace function public.enforce_patient_payer_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_patient boolean := auth.uid() = old.patient_id or public.is_admin();
  v_can_payer boolean := public.can_write_payer_org(old.payer_organization_id) or public.is_admin();
  v_account_deleting boolean := current_setting('caremate.account_deleting', true) = '1';
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

  if current_setting('caremate.syncing_shared_scopes', true) = '1' then
    return new;
  end if;

  if v_account_deleting then
    if old.status = 'approved' and new.status = 'disconnected' then
      new.disconnected_at := coalesce(new.disconnected_at, now());
      new.disconnected_by := coalesce(new.disconnected_by, 'patient');
      new.updated_at := now();
      return new;
    end if;
    if old.status = 'pending' and new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
      new.rejection_reason := coalesce(
        nullif(btrim(coalesce(new.rejection_reason, '')), ''),
        'Account deleted'
      );
      new.approved_at := null;
      new.rejected_at := null;
      new.updated_at := now();
      return new;
    end if;
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

  if new.status = old.status then
    if not (v_is_patient or v_can_payer) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending connections can change status';
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
    if old.initiated_by = 'payer' then
      if not v_is_patient then
        raise exception 'Only the patient can reject this request';
      end if;
    elsif old.initiated_by = 'patient' then
      if not v_can_payer then
        raise exception 'Only payer staff can reject this request';
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

create or replace function public.service_end_patient_connections_for_account_delete(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  perform set_config('caremate.account_deleting', '1', true);

  update public.patient_provider_connections
  set
    status = 'disconnected',
    disconnected_at = now(),
    disconnected_by = 'patient',
    shared_scopes = array['basic']::text[],
    rejection_reason = 'Account deleted',
    updated_at = now()
  where patient_id = p_user_id
    and status = 'approved';

  update public.patient_provider_connections
  set
    status = 'cancelled',
    cancelled_at = now(),
    rejection_reason = 'Account deleted',
    approved_at = null,
    rejected_at = null,
    updated_at = now()
  where patient_id = p_user_id
    and status = 'pending';

  update public.patient_payer_connections
  set
    status = 'disconnected',
    disconnected_at = now(),
    disconnected_by = 'patient',
    rejection_reason = 'Account deleted',
    updated_at = now()
  where patient_id = p_user_id
    and status = 'approved';

  update public.patient_payer_connections
  set
    status = 'cancelled',
    cancelled_at = now(),
    rejection_reason = 'Account deleted',
    approved_at = null,
    rejected_at = null,
    updated_at = now()
  where patient_id = p_user_id
    and status = 'pending';
end;
$$;

revoke all on function public.service_end_patient_connections_for_account_delete(uuid) from public;
revoke all on function public.service_end_patient_connections_for_account_delete(uuid) from anon;
revoke all on function public.service_end_patient_connections_for_account_delete(uuid) from authenticated;
grant execute on function public.service_end_patient_connections_for_account_delete(uuid) to service_role;

comment on function public.service_end_patient_connections_for_account_delete(uuid) is
  'Service-role only. Ends approved/pending patient↔provider and patient↔payer connections during account deidentification.';
