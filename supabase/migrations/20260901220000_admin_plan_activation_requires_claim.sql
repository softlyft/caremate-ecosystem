-- Admin plan activation (direct payment / complimentary) requires a claimed org.

create or replace function public.is_provider_org_claimed(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_org_members m
    where m.organization_id = p_org_id
      and m.deleted_at is null
      and m.role = 'owner'
  );
$$;

create or replace function public.is_payer_org_claimed(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payer_org_members m
    where m.organization_id = p_org_id
      and m.deleted_at is null
      and m.role = 'owner'
  );
$$;

grant execute on function public.is_provider_org_claimed(uuid) to authenticated;
grant execute on function public.is_payer_org_claimed(uuid) to authenticated;

-- Provider admin grant
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

  if not exists (
    select 1
    from public.provider_organizations o
    where o.id = p_organization_id
      and o.deleted_at is null
  ) then
    raise exception 'Provider organization not found';
  end if;

  if not public.is_provider_org_claimed(p_organization_id) then
    raise exception 'Organization must be claimed before a plan can be activated';
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

-- Payer admin grant
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

  if not exists (
    select 1
    from public.payer_organizations o
    where o.id = p_organization_id
      and o.deleted_at is null
  ) then
    raise exception 'Payer organization not found';
  end if;

  if not public.is_payer_org_claimed(p_organization_id) then
    raise exception 'Organization must be claimed before a plan can be activated';
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
