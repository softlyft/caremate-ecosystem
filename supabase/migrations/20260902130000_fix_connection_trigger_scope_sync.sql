-- Fix approve rollback: after pending→approved, messaging consent sync updates
-- shared_scopes on the same row. The enforce_*_connection_update trigger rejected
-- approved→approved updates before the status-unchanged handler ran.

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

  if new.status = old.status then
    if not (v_can_provider or v_can_payer) then
      raise exception 'Not authorized to update this connection';
    end if;
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending connections can change status';
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

    if not public.provider_org_can_approve_payer_connection(old.provider_organization_id) then
      raise exception 'Provider payer connection limit reached (%). Upgrade the organization plan.',
        public.provider_org_payer_connection_cap(old.provider_organization_id);
    end if;

    if not public.payer_org_can_approve_provider_connection(old.payer_organization_id) then
      raise exception 'Payer provider connection limit reached (%). Upgrade the organization plan.',
        public.payer_org_provider_connection_cap(old.payer_organization_id);
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
