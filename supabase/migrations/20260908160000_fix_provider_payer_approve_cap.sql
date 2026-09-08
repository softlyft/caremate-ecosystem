-- Approving a provider↔payer request checks both organizations' partner caps.
-- Those cap helpers read entitlements, which require membership in that org.
-- The approving party is a member of only one side, so the other org's check
-- raised 42501 ("Not a member of this organization") before the row could approve.

create or replace function public.provider_org_can_approve_payer_connection(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.provider_org_subscriptions;
  v_cap integer;
  v_count integer;
begin
  if p_org_id is null then
    v_cap := coalesce((public.provider_org_free_entitlements() ->> 'payer_connection_cap')::integer, 3);
  else
    select * into v_sub
    from public.provider_org_subscriptions s
    where s.organization_id = p_org_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    order by
      case s.plan_tier
        when 'enterprise' then 3
        when 'pro' then 2
        when 'basic' then 1
        else 0
      end desc,
      s.created_at desc
    limit 1;

    if not found then
      v_cap := coalesce((public.provider_org_free_entitlements() ->> 'payer_connection_cap')::integer, 3);
    else
      v_cap := coalesce(v_sub.payer_connection_cap, 3);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.provider_payer_connections c
  where c.provider_organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
end;
$$;

create or replace function public.payer_org_can_approve_provider_connection(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.payer_org_subscriptions;
  v_cap integer;
  v_count integer;
begin
  if p_org_id is null then
    v_cap := coalesce((public.payer_org_free_entitlements() ->> 'provider_connection_cap')::integer, 3);
  else
    select * into v_sub
    from public.payer_org_subscriptions s
    where s.organization_id = p_org_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    order by
      case s.plan_tier
        when 'enterprise' then 3
        when 'pro' then 2
        when 'basic' then 1
        else 0
      end desc,
      s.created_at desc
    limit 1;

    if not found then
      v_cap := coalesce((public.payer_org_free_entitlements() ->> 'provider_connection_cap')::integer, 3);
    else
      v_cap := coalesce(v_sub.provider_connection_cap, 3);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.provider_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
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
