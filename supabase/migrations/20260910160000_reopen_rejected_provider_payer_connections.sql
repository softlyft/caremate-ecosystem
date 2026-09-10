-- Allow provider↔payer connection requests to reopen a rejected row (with confirm),
-- same as cancelled/disconnected, instead of permanently blocking resend.

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
    if old.status not in ('rejected', 'cancelled', 'disconnected')
      or new.status is distinct from 'pending' then
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

    -- Cap checks must not require membership in the other organization.
    if not public.provider_org_can_approve_payer_connection(old.provider_organization_id) then
      raise exception 'Provider payer connection limit reached. Upgrade the organization plan.';
    end if;

    if not public.payer_org_can_approve_provider_connection(old.payer_organization_id) then
      raise exception 'Payer provider connection limit reached. Upgrade the organization plan.';
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

drop function if exists public.request_provider_payer_connection_by_email(uuid, text, text);
drop function if exists public.request_payer_provider_connection_by_email(uuid, text, text);

create or replace function public.request_provider_payer_connection_by_email(
  p_provider_organization_id uuid,
  p_payer_claim_email text,
  p_provider_note text default null,
  p_confirm_resend boolean default false
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
    elsif v_existing.status = 'rejected' and not coalesce(p_confirm_resend, false) then
      raise exception 'CONNECTION_REJECTED_NEEDS_CONFIRM:%',
        coalesce(v_existing.rejection_reason, '');
    elsif v_existing.status in ('rejected', 'cancelled', 'disconnected') then
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
  p_payer_note text default null,
  p_confirm_resend boolean default false
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
    elsif v_existing.status = 'rejected' and not coalesce(p_confirm_resend, false) then
      raise exception 'CONNECTION_REJECTED_NEEDS_CONFIRM:%',
        coalesce(v_existing.rejection_reason, '');
    elsif v_existing.status in ('rejected', 'cancelled', 'disconnected') then
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

comment on function public.request_provider_payer_connection_by_email(uuid, text, text, boolean) is
  'Provider requests a payer connection by claim email. Pass p_confirm_resend to reopen a rejected row.';

comment on function public.request_payer_provider_connection_by_email(uuid, text, text, boolean) is
  'Payer requests a provider connection by claim email. Pass p_confirm_resend to reopen a rejected row.';

grant execute on function public.request_provider_payer_connection_by_email(uuid, text, text, boolean) to authenticated;
grant execute on function public.request_payer_provider_connection_by_email(uuid, text, text, boolean) to authenticated;
