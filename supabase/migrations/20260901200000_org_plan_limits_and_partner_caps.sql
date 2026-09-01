-- Align org plan limits with Care Portal / marketing tiers and enforce partner connection caps.

-- ========== Provider: payer connection cap ==========
alter table public.provider_org_plan_prices
  add column if not exists payer_connection_cap integer;

alter table public.provider_org_subscriptions
  add column if not exists payer_connection_cap integer;

update public.provider_org_plan_prices
set
  pct_seat_limit = 7,
  patient_connection_cap = 50,
  payer_connection_cap = 25
where plan_tier = 'basic';

update public.provider_org_plan_prices
set
  pct_seat_limit = 25,
  patient_connection_cap = 200,
  payer_connection_cap = 75
where plan_tier = 'pro';

alter table public.provider_org_plan_prices
  alter column payer_connection_cap set not null;

alter table public.provider_org_plan_prices
  drop constraint if exists provider_org_plan_prices_payer_connection_cap_check;

alter table public.provider_org_plan_prices
  add constraint provider_org_plan_prices_payer_connection_cap_check
  check (payer_connection_cap > 0);

-- ========== Payer: provider connection cap ==========
alter table public.payer_org_plan_prices
  add column if not exists provider_connection_cap integer;

alter table public.payer_org_subscriptions
  add column if not exists provider_connection_cap integer;

update public.payer_org_plan_prices
set
  support_team_seat_limit = 7,
  patient_connection_cap = 100,
  provider_connection_cap = 25
where plan_tier = 'basic';

update public.payer_org_plan_prices
set
  support_team_seat_limit = 25,
  patient_connection_cap = 250,
  provider_connection_cap = 75
where plan_tier = 'pro';

alter table public.payer_org_plan_prices
  alter column provider_connection_cap set not null;

alter table public.payer_org_plan_prices
  drop constraint if exists payer_org_plan_prices_provider_connection_cap_check;

alter table public.payer_org_plan_prices
  add constraint payer_org_plan_prices_provider_connection_cap_check
  check (provider_connection_cap > 0);

-- ========== Free tier defaults ==========
create or replace function public.provider_org_free_entitlements()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'plan_tier', 'free',
    'billing_interval', null,
    'pct_seat_limit', 2,
    'patient_connection_cap', 20,
    'payer_connection_cap', 3,
    'voice_minutes_included', 0,
    'video_minutes_included', 0,
    'status', 'active',
    'subscription_id', null
  );
$$;

create or replace function public.payer_org_free_entitlements()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'plan_tier', 'free',
    'billing_interval', null,
    'support_team_seat_limit', 2,
    'patient_connection_cap', 7,
    'provider_connection_cap', 3,
    'voice_minutes_included', 0,
    'group_chat_enabled', false,
    'status', 'active',
    'subscription_id', null
  );
$$;

-- ========== Entitlement resolution ==========
create or replace function public.provider_org_entitlements(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.provider_org_subscriptions;
begin
  if p_org_id is null then
    return public.provider_org_free_entitlements();
  end if;

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
    return public.provider_org_free_entitlements();
  end if;

  return jsonb_build_object(
    'plan_tier', v_sub.plan_tier,
    'billing_interval', v_sub.billing_interval,
    'pct_seat_limit', v_sub.pct_seat_limit,
    'patient_connection_cap', v_sub.patient_connection_cap,
    'payer_connection_cap', v_sub.payer_connection_cap,
    'voice_minutes_included', v_sub.voice_minutes_included,
    'video_minutes_included', v_sub.video_minutes_included,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

create or replace function public.payer_org_entitlements(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub public.payer_org_subscriptions;
begin
  if p_org_id is null then
    return public.payer_org_free_entitlements();
  end if;

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
    return public.payer_org_free_entitlements();
  end if;

  return jsonb_build_object(
    'plan_tier', v_sub.plan_tier,
    'billing_interval', v_sub.billing_interval,
    'support_team_seat_limit', v_sub.support_team_seat_limit,
    'patient_connection_cap', v_sub.patient_connection_cap,
    'provider_connection_cap', v_sub.provider_connection_cap,
    'voice_minutes_included', v_sub.voice_minutes_included,
    'group_chat_enabled', v_sub.group_chat_enabled,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

-- ========== Partner connection helpers ==========
create or replace function public.provider_org_payer_connection_cap(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.provider_org_entitlements(p_org_id)->>'payer_connection_cap')::integer,
    3
  );
$$;

create or replace function public.provider_org_approved_payer_connection_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.provider_payer_connections c
  where c.provider_organization_id = p_org_id
    and c.status = 'approved';
$$;

create or replace function public.provider_org_can_approve_payer_connection(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.provider_org_approved_payer_connection_count(p_org_id)
    < public.provider_org_payer_connection_cap(p_org_id);
$$;

create or replace function public.payer_org_provider_connection_cap(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.payer_org_entitlements(p_org_id)->>'provider_connection_cap')::integer,
    3
  );
$$;

create or replace function public.payer_org_approved_provider_connection_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.provider_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';
$$;

create or replace function public.payer_org_can_approve_provider_connection(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.payer_org_approved_provider_connection_count(p_org_id)
    < public.payer_org_provider_connection_cap(p_org_id);
$$;

grant execute on function public.provider_org_payer_connection_cap(uuid) to authenticated;
grant execute on function public.provider_org_approved_payer_connection_count(uuid) to authenticated;
grant execute on function public.provider_org_can_approve_payer_connection(uuid) to authenticated;
grant execute on function public.payer_org_provider_connection_cap(uuid) to authenticated;
grant execute on function public.payer_org_approved_provider_connection_count(uuid) to authenticated;
grant execute on function public.payer_org_can_approve_provider_connection(uuid) to authenticated;

-- ========== Enforce partner caps on B2B approve ==========
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

  else
    raise exception 'Invalid status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Backfill subscription caps for active rows (best-effort by tier)
update public.provider_org_subscriptions
set payer_connection_cap = case plan_tier
  when 'basic' then 25
  when 'pro' then 75
  when 'enterprise' then 999
  else 3
end
where payer_connection_cap is null;

update public.payer_org_subscriptions
set provider_connection_cap = case plan_tier
  when 'basic' then 25
  when 'pro' then 75
  when 'enterprise' then 999
  else 3
end
where provider_connection_cap is null;

update public.provider_org_subscriptions
set
  pct_seat_limit = case plan_tier when 'basic' then 7 when 'pro' then 25 else pct_seat_limit end,
  patient_connection_cap = case plan_tier when 'basic' then 50 when 'pro' then 200 else patient_connection_cap end
where status in ('active', 'trialing')
  and plan_tier in ('basic', 'pro');

update public.payer_org_subscriptions
set
  support_team_seat_limit = case plan_tier when 'basic' then 7 when 'pro' then 25 else support_team_seat_limit end,
  patient_connection_cap = case plan_tier when 'basic' then 100 when 'pro' then 250 else patient_connection_cap end
where status in ('active', 'trialing')
  and plan_tier in ('basic', 'pro');

create or replace function public.provider_org_pct_seat_limit(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.provider_org_entitlements(p_org_id)->>'pct_seat_limit')::integer, 2);
$$;

create or replace function public.provider_org_patient_connection_cap(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.provider_org_entitlements(p_org_id)->>'patient_connection_cap')::integer,
    20
  );
$$;

create or replace function public.payer_org_support_team_seat_limit(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.payer_org_entitlements(p_org_id)->>'support_team_seat_limit')::integer,
    2
  );
$$;

create or replace function public.payer_org_patient_connection_cap(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (public.payer_org_entitlements(p_org_id)->>'patient_connection_cap')::integer,
    7
  );
$$;

-- ========== Admin grants: align defaults + partner caps ==========
drop function if exists public.admin_grant_provider_org_subscription(
  uuid, text, text, integer, integer, integer, integer, integer
);

drop function if exists public.admin_grant_payer_org_subscription(
  uuid, text, text, integer, integer, integer, boolean, integer
);

create or replace function public.admin_grant_provider_org_subscription(
  p_organization_id uuid,
  p_plan_tier text,
  p_billing_interval text default 'monthly',
  p_pct_seat_limit integer default null,
  p_patient_connection_cap integer default null,
  p_payer_connection_cap integer default null,
  p_voice_minutes_included integer default null,
  p_video_minutes_included integer default null,
  p_period_months integer default 12
)
returns public.provider_org_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.provider_org_subscriptions;
  v_seats integer;
  v_patients integer;
  v_payers integer;
  v_voice integer;
  v_video integer;
  v_start timestamptz := now();
  v_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_plan_tier not in ('basic', 'pro', 'enterprise') then
    raise exception 'Invalid plan_tier';
  end if;

  if p_billing_interval not in ('monthly', 'yearly') then
    raise exception 'Invalid billing_interval';
  end if;

  if p_plan_tier = 'basic' then
    v_seats := coalesce(p_pct_seat_limit, 7);
    v_patients := coalesce(p_patient_connection_cap, 50);
    v_payers := coalesce(p_payer_connection_cap, 25);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_video := coalesce(p_video_minutes_included, 0);
  elsif p_plan_tier = 'pro' then
    v_seats := coalesce(p_pct_seat_limit, 25);
    v_patients := coalesce(p_patient_connection_cap, 200);
    v_payers := coalesce(p_payer_connection_cap, 75);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_video := coalesce(p_video_minutes_included, 0);
  else
    v_seats := coalesce(p_pct_seat_limit, 100);
    v_patients := coalesce(p_patient_connection_cap, 1000);
    v_payers := coalesce(p_payer_connection_cap, 999);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_video := coalesce(p_video_minutes_included, 0);
  end if;

  v_end := v_start + make_interval(months => greatest(coalesce(p_period_months, 12), 1));

  update public.provider_org_subscriptions
  set
    status = 'canceled',
    updated_at = now()
  where organization_id = p_organization_id
    and status in ('active', 'trialing');

  insert into public.provider_org_subscriptions (
    organization_id,
    plan_tier,
    billing_interval,
    currency,
    provider,
    status,
    pct_seat_limit,
    patient_connection_cap,
    payer_connection_cap,
    voice_minutes_included,
    video_minutes_included,
    current_period_start,
    current_period_end
  ) values (
    p_organization_id,
    p_plan_tier,
    p_billing_interval,
    'NGN',
    'admin',
    'active',
    v_seats,
    v_patients,
    v_payers,
    v_voice,
    v_video,
    v_start,
    v_end
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_grant_payer_org_subscription(
  p_organization_id uuid,
  p_plan_tier text,
  p_billing_interval text default 'monthly',
  p_support_team_seat_limit integer default null,
  p_patient_connection_cap integer default null,
  p_provider_connection_cap integer default null,
  p_voice_minutes_included integer default null,
  p_group_chat_enabled boolean default null,
  p_period_months integer default 12
)
returns public.payer_org_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payer_org_subscriptions;
  v_seats integer;
  v_patients integer;
  v_providers integer;
  v_voice integer;
  v_group boolean;
  v_start timestamptz := now();
  v_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_plan_tier not in ('basic', 'pro', 'enterprise') then
    raise exception 'Invalid plan_tier';
  end if;

  if p_billing_interval not in ('monthly', 'yearly') then
    raise exception 'Invalid billing_interval';
  end if;

  if p_plan_tier = 'basic' then
    v_seats := coalesce(p_support_team_seat_limit, 7);
    v_patients := coalesce(p_patient_connection_cap, 100);
    v_providers := coalesce(p_provider_connection_cap, 25);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_group := coalesce(p_group_chat_enabled, false);
  elsif p_plan_tier = 'pro' then
    v_seats := coalesce(p_support_team_seat_limit, 25);
    v_patients := coalesce(p_patient_connection_cap, 250);
    v_providers := coalesce(p_provider_connection_cap, 75);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_group := coalesce(p_group_chat_enabled, true);
  else
    v_seats := coalesce(p_support_team_seat_limit, 100);
    v_patients := coalesce(p_patient_connection_cap, 1000);
    v_providers := coalesce(p_provider_connection_cap, 999);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_group := coalesce(p_group_chat_enabled, true);
  end if;

  v_end := v_start + make_interval(months => greatest(coalesce(p_period_months, 12), 1));

  update public.payer_org_subscriptions
  set
    status = 'canceled',
    updated_at = now()
  where organization_id = p_organization_id
    and status in ('active', 'trialing');

  insert into public.payer_org_subscriptions (
    organization_id,
    plan_tier,
    billing_interval,
    currency,
    provider,
    status,
    support_team_seat_limit,
    patient_connection_cap,
    provider_connection_cap,
    voice_minutes_included,
    group_chat_enabled,
    current_period_start,
    current_period_end
  ) values (
    p_organization_id,
    p_plan_tier,
    p_billing_interval,
    'NGN',
    'admin',
    'active',
    v_seats,
    v_patients,
    v_providers,
    v_voice,
    v_group,
    v_start,
    v_end
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_grant_provider_org_subscription(
  uuid, text, text, integer, integer, integer, integer, integer, integer
) to authenticated;

grant execute on function public.admin_grant_payer_org_subscription(
  uuid, text, text, integer, integer, integer, integer, boolean, integer
) to authenticated;
