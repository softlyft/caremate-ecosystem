-- Patient approve of a provider/payer-initiated request called
-- provider_org_can_approve_patient / payer_org_can_approve_patient, which now
-- require org membership. Patients are not members, so approve always failed
-- with "Not a member of this organization".
--
-- Cap checks used inside connection RPCs must not expose billing data. Keep the
-- public helpers membership-gated; use unchecked helpers only from security
-- definer connection functions.

create or replace function public.provider_org_can_approve_patient_unchecked(p_org_id uuid)
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
    v_cap := coalesce((public.provider_org_free_entitlements() ->> 'patient_connection_cap')::integer, 20);
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
      v_cap := coalesce((public.provider_org_free_entitlements() ->> 'patient_connection_cap')::integer, 20);
    else
      v_cap := coalesce(v_sub.patient_connection_cap, 20);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.patient_provider_connections c
  where c.organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
end;
$$;

create or replace function public.payer_org_can_approve_patient_unchecked(p_org_id uuid)
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
    v_cap := coalesce((public.payer_org_free_entitlements() ->> 'patient_connection_cap')::integer, 7);
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
      v_cap := coalesce((public.payer_org_free_entitlements() ->> 'patient_connection_cap')::integer, 7);
    else
      v_cap := coalesce(v_sub.patient_connection_cap, 7);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.patient_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
end;
$$;

revoke all on function public.provider_org_can_approve_patient_unchecked(uuid) from public, anon, authenticated;
revoke all on function public.payer_org_can_approve_patient_unchecked(uuid) from public, anon, authenticated;

-- Security-definer connection RPCs run as the function owner. Keep these
-- callable by that owner and service_role, not by mobile/portal users directly.
grant execute on function public.provider_org_can_approve_patient_unchecked(uuid) to postgres;
grant execute on function public.payer_org_can_approve_patient_unchecked(uuid) to postgres;
grant execute on function public.provider_org_can_approve_patient_unchecked(uuid) to service_role;
grant execute on function public.payer_org_can_approve_patient_unchecked(uuid) to service_role;

create or replace function public.provider_org_can_approve_patient(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_sub public.provider_org_subscriptions;
  v_cap integer;
  v_count integer;
begin
  -- Org staff may read the cap. The invited patient must also pass this check
  -- when they approve a provider-initiated request; they are not org members.
  v_allowed := public.is_staff() or public.is_provider_org_member(p_org_id);
  if not v_allowed and auth.uid() is not null then
    v_allowed := exists (
      select 1
      from public.patient_provider_connections c
      where c.organization_id = p_org_id
        and c.patient_id = auth.uid()
        and c.status in ('pending', 'approved')
    );
  end if;
  if not v_allowed then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;

  if p_org_id is null then
    v_cap := coalesce((public.provider_org_free_entitlements() ->> 'patient_connection_cap')::integer, 20);
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
      v_cap := coalesce((public.provider_org_free_entitlements() ->> 'patient_connection_cap')::integer, 20);
    else
      v_cap := coalesce(v_sub.patient_connection_cap, 20);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.patient_provider_connections c
  where c.organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
end;
$$;

create or replace function public.payer_org_can_approve_patient(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_sub public.payer_org_subscriptions;
  v_cap integer;
  v_count integer;
begin
  v_allowed := public.is_staff() or public.is_payer_org_member(p_org_id);
  if not v_allowed and auth.uid() is not null then
    v_allowed := exists (
      select 1
      from public.patient_payer_connections c
      where c.payer_organization_id = p_org_id
        and c.patient_id = auth.uid()
        and c.status in ('pending', 'approved')
    );
  end if;
  if not v_allowed then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;

  if p_org_id is null then
    v_cap := coalesce((public.payer_org_free_entitlements() ->> 'patient_connection_cap')::integer, 7);
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
      v_cap := coalesce((public.payer_org_free_entitlements() ->> 'patient_connection_cap')::integer, 7);
    else
      v_cap := coalesce(v_sub.patient_connection_cap, 7);
    end if;
  end if;

  select count(*)::integer into v_count
  from public.patient_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';

  return coalesce(v_count, 0) < v_cap;
end;
$$;

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
    if not public.provider_org_can_approve_patient(v_conn.organization_id)
      and not public.is_admin() then
      raise exception
        'Patient connection limit reached for this organization plan. Upgrade Private Care Team to connect more patients.';
    end if;

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
    if not public.payer_org_can_approve_patient(v_conn.payer_organization_id)
      and not public.is_admin() then
      raise exception
        'Patient connection limit reached for this organization plan. Upgrade Support Team to connect more patients.';
    end if;

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
