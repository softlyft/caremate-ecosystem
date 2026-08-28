-- Private Care Team: org-level plans (Paystack only), PCT member flag, DM ACL + patient caps.
-- Fully separate from patient Premium (subscription_prices / payments / subscriptions).

-- ========== Catalog ==========
create table if not exists public.provider_org_plan_prices (
  id text primary key,
  plan_tier text not null check (plan_tier in ('basic', 'pro')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null check (currency in ('NGN')),
  amount_minor integer not null check (amount_minor >= 0),
  provider text not null default 'paystack' check (provider = 'paystack'),
  paystack_plan_code text,
  pct_seat_limit integer not null check (pct_seat_limit > 0),
  patient_connection_cap integer not null check (patient_connection_cap > 0),
  voice_minutes_included integer not null default 0 check (voice_minutes_included >= 0),
  video_minutes_included integer not null default 0 check (video_minutes_included >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_tier, billing_interval, currency)
);

comment on table public.provider_org_plan_prices is
  'Care Portal Private Care Team paid catalog (Basic/Pro). Free is implicit; Enterprise is SoftLyft grant.';

alter table public.provider_org_plan_prices enable row level security;

drop policy if exists "Authenticated read active provider_org_plan_prices"
  on public.provider_org_plan_prices;
create policy "Authenticated read active provider_org_plan_prices"
  on public.provider_org_plan_prices for select
  to authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Admins manage provider_org_plan_prices"
  on public.provider_org_plan_prices;
create policy "Admins manage provider_org_plan_prices"
  on public.provider_org_plan_prices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists provider_org_plan_prices_set_updated_at on public.provider_org_plan_prices;
create trigger provider_org_plan_prices_set_updated_at
  before update on public.provider_org_plan_prices
  for each row execute function public.set_updated_at();

-- Seed defaults (editable in SoftLyft admin). amount_minor = NGN kobo.
insert into public.provider_org_plan_prices (
  id, plan_tier, billing_interval, currency, amount_minor, provider,
  pct_seat_limit, patient_connection_cap,
  voice_minutes_included, video_minutes_included, is_active
) values
  ('prov_basic_monthly_ngn', 'basic', 'monthly', 'NGN', 1500000, 'paystack', 5, 20, 6000, 6000, true),
  ('prov_basic_yearly_ngn',  'basic', 'yearly',  'NGN', 15000000, 'paystack', 5, 20, 6000, 6000, true),
  ('prov_pro_monthly_ngn',   'pro',   'monthly', 'NGN', 4500000, 'paystack', 20, 100, 15000, 15000, true),
  ('prov_pro_yearly_ngn',    'pro',   'yearly',  'NGN', 45000000, 'paystack', 20, 100, 15000, 15000, true)
on conflict (id) do nothing;

-- ========== Subscriptions ==========
create table if not exists public.provider_org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  plan_tier text not null check (plan_tier in ('basic', 'pro', 'enterprise')),
  billing_interval text not null check (billing_interval in ('monthly', 'yearly')),
  currency text not null default 'NGN' check (currency in ('NGN')),
  provider text not null check (provider in ('admin', 'paystack')),
  status text not null default 'incomplete'
    check (status in ('active', 'past_due', 'canceled', 'expired', 'incomplete', 'trialing')),
  pct_seat_limit integer not null check (pct_seat_limit > 0),
  patient_connection_cap integer not null check (patient_connection_cap > 0),
  voice_minutes_included integer not null default 0 check (voice_minutes_included >= 0),
  video_minutes_included integer not null default 0 check (video_minutes_included >= 0),
  provider_customer_id text,
  provider_subscription_id text,
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_org_subscriptions_org_idx
  on public.provider_org_subscriptions (organization_id);

create index if not exists provider_org_subscriptions_status_idx
  on public.provider_org_subscriptions (organization_id, status);

create index if not exists provider_org_subscriptions_provider_ref_idx
  on public.provider_org_subscriptions (provider_ref);

comment on table public.provider_org_subscriptions is
  'Active Care Portal org entitlements. Missing/expired row = Free defaults.';

alter table public.provider_org_subscriptions enable row level security;

drop policy if exists "Members read own org provider_org_subscriptions"
  on public.provider_org_subscriptions;
create policy "Members read own org provider_org_subscriptions"
  on public.provider_org_subscriptions for select
  to authenticated
  using (
    public.is_provider_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.provider_org_subscriptions from authenticated, anon;
grant select on public.provider_org_subscriptions to authenticated;
grant all on public.provider_org_subscriptions to service_role;

drop trigger if exists provider_org_subscriptions_set_updated_at
  on public.provider_org_subscriptions;
create trigger provider_org_subscriptions_set_updated_at
  before update on public.provider_org_subscriptions
  for each row execute function public.set_updated_at();

-- ========== Payments ==========
create table if not exists public.provider_org_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  subscription_id uuid references public.provider_org_subscriptions (id) on delete set null,
  plan_price_id text references public.provider_org_plan_prices (id) on delete set null,
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

create index if not exists provider_org_payments_org_idx
  on public.provider_org_payments (organization_id, created_at desc);

create index if not exists provider_org_payments_provider_ref_idx
  on public.provider_org_payments (provider_reference);

alter table public.provider_org_payments enable row level security;

drop policy if exists "Members read own org provider_org_payments"
  on public.provider_org_payments;
create policy "Members read own org provider_org_payments"
  on public.provider_org_payments for select
  to authenticated
  using (
    public.is_provider_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.provider_org_payments from authenticated, anon;
grant select on public.provider_org_payments to authenticated;
grant all on public.provider_org_payments to service_role;

drop trigger if exists provider_org_payments_set_updated_at on public.provider_org_payments;
create trigger provider_org_payments_set_updated_at
  before update on public.provider_org_payments
  for each row execute function public.set_updated_at();

-- ========== Usage counters (voice/video later) ==========
create table if not exists public.provider_org_usage_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  voice_minutes_used integer not null default 0 check (voice_minutes_used >= 0),
  video_minutes_used integer not null default 0 check (video_minutes_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start)
);

alter table public.provider_org_usage_counters enable row level security;

drop policy if exists "Members read own org provider_org_usage_counters"
  on public.provider_org_usage_counters;
create policy "Members read own org provider_org_usage_counters"
  on public.provider_org_usage_counters for select
  to authenticated
  using (
    public.is_provider_org_member(organization_id)
    or public.is_staff()
  );

revoke insert, update, delete on public.provider_org_usage_counters from authenticated, anon;
grant select on public.provider_org_usage_counters to authenticated;
grant all on public.provider_org_usage_counters to service_role;

drop trigger if exists provider_org_usage_counters_set_updated_at
  on public.provider_org_usage_counters;
create trigger provider_org_usage_counters_set_updated_at
  before update on public.provider_org_usage_counters
  for each row execute function public.set_updated_at();

-- ========== PCT flag on members ==========
alter table public.provider_org_members
  add column if not exists private_care_team boolean not null default false;

comment on column public.provider_org_members.private_care_team is
  'When true, member may DM connected patients (requires plan seat). Separate from org membership role.';

create index if not exists provider_org_members_pct_idx
  on public.provider_org_members (organization_id)
  where deleted_at is null and private_care_team = true;

-- ========== Entitlement helpers ==========
create or replace function public.provider_org_free_entitlements()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'plan_tier', 'free',
    'billing_interval', null,
    'pct_seat_limit', 1,
    'patient_connection_cap', 5,
    'voice_minutes_included', 0,
    'video_minutes_included', 0,
    'status', 'active',
    'subscription_id', null
  );
$$;

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
    'voice_minutes_included', v_sub.voice_minutes_included,
    'video_minutes_included', v_sub.video_minutes_included,
    'status', v_sub.status,
    'subscription_id', v_sub.id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

create or replace function public.provider_org_pct_seat_limit(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((public.provider_org_entitlements(p_org_id)->>'pct_seat_limit')::integer, 1);
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
    5
  );
$$;

create or replace function public.provider_org_approved_patient_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.patient_provider_connections c
  where c.organization_id = p_org_id
    and c.status = 'approved';
$$;

create or replace function public.provider_org_pct_member_count(p_org_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.provider_org_members m
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.private_care_team = true;
$$;

create or replace function public.provider_org_can_approve_patient(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.provider_org_approved_patient_count(p_org_id)
    < public.provider_org_patient_connection_cap(p_org_id);
$$;

create or replace function public.is_private_care_team_member(
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
    from public.provider_org_members m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.deleted_at is null
      and m.private_care_team = true
      and m.role in ('owner', 'administrator', 'staff')
  );
$$;

grant execute on function public.is_private_care_team_member(uuid, uuid) to authenticated;

-- Patient DMs require PCT; staff↔staff keep membership-based practitioner check.
create or replace function public.can_direct_message(
  p_org_id uuid,
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and p_user_a <> p_user_b
    and p_org_id is not null
    and public.is_linked_to_org(p_org_id, p_user_a)
    and public.is_linked_to_org(p_org_id, p_user_b)
    and (
      -- Staff ↔ staff
      (
        public.is_org_practitioner(p_org_id, p_user_a)
        and public.is_org_practitioner(p_org_id, p_user_b)
      )
      or (
        public.is_private_care_team_member(p_org_id, p_user_a)
        and public.has_org_messaging_consent(p_org_id, p_user_b)
      )
      or (
        public.is_private_care_team_member(p_org_id, p_user_b)
        and public.has_org_messaging_consent(p_org_id, p_user_a)
      )
    );
$$;

-- ========== set_private_care_team_member ==========
create or replace function public.set_private_care_team_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_enabled boolean
)
returns public.provider_org_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.provider_org_members;
  v_limit integer;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_provider_org(p_organization_id) and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select * into v_row
  from public.provider_org_members m
  where m.organization_id = p_organization_id
    and m.user_id = p_user_id
    and m.deleted_at is null;

  if not found then
    raise exception 'User is not an active organization member';
  end if;

  if v_row.role = 'viewer' and p_enabled then
    raise exception 'Viewers cannot join the Private Care Team';
  end if;

  if p_enabled and not v_row.private_care_team then
    v_limit := public.provider_org_pct_seat_limit(p_organization_id);
    v_count := public.provider_org_pct_member_count(p_organization_id);
    if v_count >= v_limit then
      raise exception 'Private Care Team seat limit reached (%). Upgrade the organization plan.', v_limit;
    end if;
  end if;

  update public.provider_org_members
  set
    private_care_team = coalesce(p_enabled, false),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_private_care_team_member(uuid, uuid, boolean) is
  'Owner/admin toggles Private Care Team membership within plan seat limits.';

grant execute on function public.set_private_care_team_member(uuid, uuid, boolean) to authenticated;

-- ========== SoftLyft admin grant ==========
create or replace function public.admin_grant_provider_org_subscription(
  p_organization_id uuid,
  p_plan_tier text,
  p_billing_interval text default 'monthly',
  p_pct_seat_limit integer default null,
  p_patient_connection_cap integer default null,
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
    v_seats := coalesce(p_pct_seat_limit, 5);
    v_patients := coalesce(p_patient_connection_cap, 20);
    v_voice := coalesce(p_voice_minutes_included, 6000);
    v_video := coalesce(p_video_minutes_included, 6000);
  elsif p_plan_tier = 'pro' then
    v_seats := coalesce(p_pct_seat_limit, 20);
    v_patients := coalesce(p_patient_connection_cap, 100);
    v_voice := coalesce(p_voice_minutes_included, 15000);
    v_video := coalesce(p_video_minutes_included, 15000);
  else
    v_seats := coalesce(p_pct_seat_limit, 100);
    v_patients := coalesce(p_patient_connection_cap, 1000);
    v_voice := coalesce(p_voice_minutes_included, 0);
    v_video := coalesce(p_video_minutes_included, 0);
  end if;

  v_end := v_start + make_interval(months => greatest(coalesce(p_period_months, 12), 1));

  -- Expire prior active entitlements for this org
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
    v_voice,
    v_video,
    v_start,
    v_end
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_grant_provider_org_subscription(
  uuid, text, text, integer, integer, integer, integer, integer
) to authenticated;

-- ========== Patient cap on approve ==========
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

-- Cap provider-initiated requests that reopen cancelled/disconnected into approved? Those stay pending.
-- Also block provider request when already at cap if they would immediately... they create pending, ok.
-- Cap on patient approve of provider-initiated request is covered above.

comment on function public.provider_org_entitlements(uuid) is
  'Resolved Private Care Team limits for an org (Free defaults when no active paid/admin sub).';

grant execute on function public.provider_org_entitlements(uuid) to authenticated;
grant execute on function public.provider_org_pct_seat_limit(uuid) to authenticated;
grant execute on function public.provider_org_patient_connection_cap(uuid) to authenticated;
grant execute on function public.provider_org_approved_patient_count(uuid) to authenticated;
grant execute on function public.provider_org_pct_member_count(uuid) to authenticated;
grant execute on function public.provider_org_can_approve_patient(uuid) to authenticated;
grant execute on function public.is_private_care_team_member(uuid, uuid) to authenticated;
grant execute on function public.set_private_care_team_member(uuid, uuid, boolean) to authenticated;
grant execute on function public.admin_grant_provider_org_subscription(
  uuid, text, text, integer, integer, integer, integer, integer
) to authenticated;
