-- Payer portal Support Team billing (parallel to provider Private Care Team).
-- Text + voice only (no video). Pro unlocks tri-party group chat (future workflows).

-- ========== Plan catalog ==========
create table if not exists public.payer_org_plan_prices (
  id text primary key,
  plan_tier text not null check (plan_tier in ('basic', 'pro')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null default 'NGN' check (currency in ('NGN')),
  amount_minor integer not null check (amount_minor >= 0),
  provider text not null default 'paystack' check (provider = 'paystack'),
  paystack_plan_code text,
  support_team_seat_limit integer not null check (support_team_seat_limit > 0),
  patient_connection_cap integer not null check (patient_connection_cap > 0),
  voice_minutes_included integer not null default 0 check (voice_minutes_included >= 0),
  group_chat_enabled boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_tier, billing_interval, currency)
);

comment on table public.payer_org_plan_prices is
  'SoftLyft-editable Support Team catalog for payer orgs (separate from provider_org_plan_prices).';

alter table public.payer_org_plan_prices enable row level security;

drop policy if exists "Authenticated read active payer_org_plan_prices"
  on public.payer_org_plan_prices;
create policy "Authenticated read active payer_org_plan_prices"
  on public.payer_org_plan_prices for select
  to authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Admins manage payer_org_plan_prices"
  on public.payer_org_plan_prices;
create policy "Admins manage payer_org_plan_prices"
  on public.payer_org_plan_prices for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop trigger if exists payer_org_plan_prices_set_updated_at on public.payer_org_plan_prices;
create trigger payer_org_plan_prices_set_updated_at
  before update on public.payer_org_plan_prices
  for each row execute function public.set_updated_at();

insert into public.payer_org_plan_prices (
  id, plan_tier, billing_interval, currency, amount_minor, provider,
  support_team_seat_limit, patient_connection_cap,
  voice_minutes_included, group_chat_enabled, is_active
) values
  ('payer_basic_monthly_ngn', 'basic', 'monthly', 'NGN', 1200000, 'paystack', 5, 20, 6000, false, true),
  ('payer_basic_yearly_ngn',  'basic', 'yearly',  'NGN', 12000000, 'paystack', 5, 20, 6000, false, true),
  ('payer_pro_monthly_ngn',   'pro',   'monthly', 'NGN', 3800000, 'paystack', 20, 100, 15000, true, true),
  ('payer_pro_yearly_ngn',    'pro',   'yearly',  'NGN', 38000000, 'paystack', 20, 100, 15000, true, true)
on conflict (id) do nothing;

-- ========== Subscriptions ==========
create table if not exists public.payer_org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  plan_tier text not null check (plan_tier in ('basic', 'pro', 'enterprise')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null default 'NGN' check (currency in ('NGN')),
  provider text not null check (provider in ('admin', 'paystack')),
  status text not null default 'incomplete'
    check (status in ('active', 'past_due', 'canceled', 'expired', 'incomplete', 'trialing')),
  support_team_seat_limit integer not null check (support_team_seat_limit > 0),
  patient_connection_cap integer not null check (patient_connection_cap > 0),
  voice_minutes_included integer not null default 0 check (voice_minutes_included >= 0),
  group_chat_enabled boolean not null default false,
  provider_customer_id text,
  provider_subscription_id text,
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payer_org_subscriptions_org_idx
  on public.payer_org_subscriptions (organization_id);

create index if not exists payer_org_subscriptions_status_idx
  on public.payer_org_subscriptions (organization_id, status);

create index if not exists payer_org_subscriptions_provider_ref_idx
  on public.payer_org_subscriptions (provider_ref);

comment on table public.payer_org_subscriptions is
  'Active payer org Support Team entitlements. Missing/expired row = Free defaults.';

alter table public.payer_org_subscriptions enable row level security;

drop policy if exists "Members read own org payer_org_subscriptions"
  on public.payer_org_subscriptions;
create policy "Members read own org payer_org_subscriptions"
  on public.payer_org_subscriptions for select
  to authenticated
  using (
    public.is_payer_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.payer_org_subscriptions from authenticated, anon;
grant select on public.payer_org_subscriptions to authenticated;
grant all on public.payer_org_subscriptions to service_role;

drop trigger if exists payer_org_subscriptions_set_updated_at
  on public.payer_org_subscriptions;
create trigger payer_org_subscriptions_set_updated_at
  before update on public.payer_org_subscriptions
  for each row execute function public.set_updated_at();

-- ========== Payments ==========
create table if not exists public.payer_org_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  subscription_id uuid references public.payer_org_subscriptions (id) on delete set null,
  plan_price_id text references public.payer_org_plan_prices (id) on delete set null,
  plan_tier text not null check (plan_tier in ('basic', 'pro')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null default 'NGN' check (currency in ('NGN')),
  provider text not null default 'paystack' check (provider = 'paystack'),
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  provider_reference text,
  provider_transaction_id text,
  provider_customer_id text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payer_org_payments_org_idx
  on public.payer_org_payments (organization_id, created_at desc);

create index if not exists payer_org_payments_provider_ref_idx
  on public.payer_org_payments (provider_reference);

alter table public.payer_org_payments enable row level security;

drop policy if exists "Members read own org payer_org_payments"
  on public.payer_org_payments;
create policy "Members read own org payer_org_payments"
  on public.payer_org_payments for select
  to authenticated
  using (
    public.is_payer_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.payer_org_payments from authenticated, anon;
grant select on public.payer_org_payments to authenticated;
grant all on public.payer_org_payments to service_role;

drop trigger if exists payer_org_payments_set_updated_at on public.payer_org_payments;
create trigger payer_org_payments_set_updated_at
  before update on public.payer_org_payments
  for each row execute function public.set_updated_at();

-- ========== Usage counters (voice only) ==========
create table if not exists public.payer_org_usage_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.payer_organizations (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  voice_minutes_used integer not null default 0 check (voice_minutes_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start)
);

alter table public.payer_org_usage_counters enable row level security;

drop policy if exists "Members read own org payer_org_usage_counters"
  on public.payer_org_usage_counters;
create policy "Members read own org payer_org_usage_counters"
  on public.payer_org_usage_counters for select
  to authenticated
  using (
    public.is_payer_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.payer_org_usage_counters from authenticated, anon;
grant select on public.payer_org_usage_counters to authenticated;
grant all on public.payer_org_usage_counters to service_role;

drop trigger if exists payer_org_usage_counters_set_updated_at
  on public.payer_org_usage_counters;
create trigger payer_org_usage_counters_set_updated_at
  before update on public.payer_org_usage_counters
  for each row execute function public.set_updated_at();

-- ========== Support Team flag + staff company fields ==========
alter table public.payer_org_members
  add column if not exists support_team boolean not null default false,
  add column if not exists company_email text,
  add column if not exists company_phone text,
  add column if not exists position text;

comment on column public.payer_org_members.support_team is
  'When true, member may DM connected patients (requires plan seat). Separate from org membership role.';

create index if not exists payer_org_members_support_team_idx
  on public.payer_org_members (organization_id)
  where deleted_at is null and support_team = true;

-- ========== Entitlement helpers ==========
create or replace function public.payer_org_free_entitlements()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'plan_tier', 'free',
    'billing_interval', null,
    'support_team_seat_limit', 1,
    'patient_connection_cap', 5,
    'voice_minutes_included', 0,
    'group_chat_enabled', false,
    'status', 'active',
    'subscription_id', null
  );
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
    'voice_minutes_included', v_sub.voice_minutes_included,
    'group_chat_enabled', v_sub.group_chat_enabled,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
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
    1
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
    5
  );
$$;

create or replace function public.payer_org_approved_patient_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.patient_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';
$$;

create or replace function public.payer_org_support_team_member_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.payer_org_members m
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.support_team = true;
$$;

create or replace function public.payer_org_can_approve_patient(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.payer_org_approved_patient_count(p_org_id)
    < public.payer_org_patient_connection_cap(p_org_id);
$$;

create or replace function public.is_support_team_member(
  p_org_id uuid,
  p_user_id uuid
)
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
      and m.user_id = p_user_id
      and m.deleted_at is null
      and m.support_team = true
      and m.role in ('owner', 'administrator', 'staff')
  );
$$;

-- ========== set_support_team_member ==========
create or replace function public.set_support_team_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_enabled boolean
)
returns public.payer_org_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payer_org_members;
  v_limit integer;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_payer_org(p_organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select * into v_row
  from public.payer_org_members m
  where m.organization_id = p_organization_id
    and m.user_id = p_user_id
    and m.deleted_at is null;

  if not found then
    raise exception 'User is not an active organization member';
  end if;

  if v_row.role = 'viewer' and p_enabled then
    raise exception 'Viewers cannot join the Support Team';
  end if;

  if p_enabled and not v_row.support_team then
    v_limit := public.payer_org_support_team_seat_limit(p_organization_id);
    v_count := public.payer_org_support_team_member_count(p_organization_id);
    if v_count >= v_limit then
      raise exception 'Support Team seat limit reached (%). Upgrade the organization plan.', v_limit;
    end if;
  end if;

  update public.payer_org_members
  set
    support_team = coalesce(p_enabled, false),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_support_team_member(uuid, uuid, boolean) is
  'Owner/admin toggles Support Team membership within plan seat limits.';

-- ========== Mark connected patient as payer staff ==========
create or replace function public.mark_connected_patient_as_payer_staff(
  p_organization_id uuid,
  p_patient_user_id uuid,
  p_company_email text default null,
  p_company_phone text default null,
  p_position text default null,
  p_display_name text default null
)
returns public.payer_org_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection public.patient_payer_connections;
  v_profile public.profiles;
  v_existing public.payer_org_members;
  v_row public.payer_org_members;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_organization_id is null or p_patient_user_id is null then
    raise exception 'Organization and patient are required';
  end if;

  if not (public.can_manage_payer_org(p_organization_id) or public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if p_patient_user_id = auth.uid() then
    raise exception 'You cannot mark yourself as staff from a patient connection';
  end if;

  select * into v_connection
  from public.patient_payer_connections c
  where c.payer_organization_id = p_organization_id
    and c.patient_id = p_patient_user_id
    and c.status = 'approved';

  if not found then
    raise exception 'Patient must have an approved connection with this organization';
  end if;

  select * into v_profile
  from public.profiles p
  where p.user_id = p_patient_user_id
  limit 1;

  v_display := nullif(btrim(coalesce(p_display_name, '')), '');
  if v_display is null and v_profile is not null then
    v_display := nullif(btrim(coalesce(v_profile.full_name, '')), '');
  end if;

  select * into v_existing
  from public.payer_org_members m
  where m.organization_id = p_organization_id
    and m.user_id = p_patient_user_id;

  if found then
    if v_existing.deleted_at is not null then
      update public.payer_org_members
      set
        deleted_at = null,
        role = 'staff',
        display_name = coalesce(v_display, display_name),
        company_email = nullif(btrim(coalesce(p_company_email, '')), ''),
        company_phone = nullif(btrim(coalesce(p_company_phone, '')), ''),
        position = nullif(btrim(coalesce(p_position, '')), ''),
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;
    else
      update public.payer_org_members
      set
        display_name = coalesce(v_display, display_name),
        company_email = coalesce(nullif(btrim(coalesce(p_company_email, '')), ''), company_email),
        company_phone = coalesce(nullif(btrim(coalesce(p_company_phone, '')), ''), company_phone),
        position = coalesce(nullif(btrim(coalesce(p_position, '')), ''), position),
        updated_at = now()
      where id = v_existing.id
      returning * into v_row;
    end if;
  else
    insert into public.payer_org_members (
      organization_id,
      user_id,
      role,
      display_name,
      company_email,
      company_phone,
      position
    ) values (
      p_organization_id,
      p_patient_user_id,
      'staff',
      v_display,
      nullif(btrim(coalesce(p_company_email, '')), ''),
      nullif(btrim(coalesce(p_company_phone, '')), ''),
      nullif(btrim(coalesce(p_position, '')), '')
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

comment on function public.mark_connected_patient_as_payer_staff(uuid, uuid, text, text, text, text) is
  'Owner/admin elevates an approved connected patient to payer org staff (does not add Support Team seat).';

-- ========== SoftLyft admin grant ==========
create or replace function public.admin_grant_payer_org_subscription(
  p_organization_id uuid,
  p_plan_tier text,
  p_billing_interval text default 'monthly',
  p_support_team_seat_limit integer default null,
  p_patient_connection_cap integer default null,
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
    v_seats := coalesce(p_support_team_seat_limit, 5);
    v_patients := coalesce(p_patient_connection_cap, 20);
    v_voice := coalesce(p_voice_minutes_included, 6000);
    v_group := coalesce(p_group_chat_enabled, false);
  elsif p_plan_tier = 'pro' then
    v_seats := coalesce(p_support_team_seat_limit, 20);
    v_patients := coalesce(p_patient_connection_cap, 100);
    v_voice := coalesce(p_voice_minutes_included, 15000);
    v_group := coalesce(p_group_chat_enabled, true);
  else
    v_seats := coalesce(p_support_team_seat_limit, 100);
    v_patients := coalesce(p_patient_connection_cap, 1000);
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
    v_voice,
    v_group,
    v_start,
    v_end
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ========== Patient cap on payer connection approve ==========
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

comment on function public.payer_org_entitlements(uuid) is
  'Resolved Support Team limits for a payer org (Free defaults when no active paid/admin sub).';

grant execute on function public.payer_org_entitlements(uuid) to authenticated;
grant execute on function public.payer_org_support_team_seat_limit(uuid) to authenticated;
grant execute on function public.payer_org_patient_connection_cap(uuid) to authenticated;
grant execute on function public.payer_org_approved_patient_count(uuid) to authenticated;
grant execute on function public.payer_org_support_team_member_count(uuid) to authenticated;
grant execute on function public.payer_org_can_approve_patient(uuid) to authenticated;
grant execute on function public.is_support_team_member(uuid, uuid) to authenticated;
grant execute on function public.set_support_team_member(uuid, uuid, boolean) to authenticated;
grant execute on function public.mark_connected_patient_as_payer_staff(
  uuid, uuid, text, text, text, text
) to authenticated;
grant execute on function public.admin_grant_payer_org_subscription(
  uuid, text, text, integer, integer, integer, boolean, integer
) to authenticated;
