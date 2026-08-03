-- Provider capability modules + appointments scheduling + laboratory workflow.

-- ========== Module activation ==========
create table if not exists public.provider_org_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  enabled_at timestamptz,
  enabled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_key)
);

create index if not exists provider_org_modules_org_idx
  on public.provider_org_modules (organization_id);

comment on table public.provider_org_modules is
  'Per-org module enablement overrides. Missing row = use CareMate catalog default.';

drop trigger if exists provider_org_modules_set_updated_at on public.provider_org_modules;
create trigger provider_org_modules_set_updated_at
  before update on public.provider_org_modules
  for each row
  execute function public.set_updated_at();

alter table public.provider_org_modules enable row level security;

drop policy if exists "Org members read modules" on public.provider_org_modules;
create policy "Org members read modules"
  on public.provider_org_modules for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

drop policy if exists "Org managers write modules" on public.provider_org_modules;
create policy "Org managers write modules"
  on public.provider_org_modules for all to authenticated
  using (public.can_manage_provider_org(organization_id) or public.is_admin())
  with check (public.can_manage_provider_org(organization_id) or public.is_admin());

grant select, insert, update, delete on public.provider_org_modules to authenticated;

-- ========== Appointments: availability + richer statuses ==========
create table if not exists public.provider_appointment_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday (JS Date.getDay)
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 30
    check (slot_minutes in (15, 20, 30, 45, 60)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists provider_appointment_availability_org_idx
  on public.provider_appointment_availability (organization_id, weekday)
  where active = true;

comment on table public.provider_appointment_availability is
  'Weekly availability windows for portal scheduling (no calendar sync).';

drop trigger if exists provider_appointment_availability_set_updated_at
  on public.provider_appointment_availability;
create trigger provider_appointment_availability_set_updated_at
  before update on public.provider_appointment_availability
  for each row
  execute function public.set_updated_at();

alter table public.provider_appointment_availability enable row level security;

drop policy if exists "Org members read availability"
  on public.provider_appointment_availability;
create policy "Org members read availability"
  on public.provider_appointment_availability for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

drop policy if exists "Org writers manage availability"
  on public.provider_appointment_availability;
create policy "Org writers manage availability"
  on public.provider_appointment_availability for all to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

grant select, insert, update, delete on public.provider_appointment_availability to authenticated;

-- Extend appointment_requests
alter table public.appointment_requests
  drop constraint if exists appointment_requests_status_check;

alter table public.appointment_requests
  add constraint appointment_requests_status_check
  check (status in (
    'pending',
    'confirmed',
    'rejected',
    'completed',
    'rescheduled',
    'checked_in',
    'cancelled'
  ));

alter table public.appointment_requests
  add column if not exists source text not null default 'patient_request'
    check (source in ('patient_request', 'provider_scheduled'));

alter table public.appointment_requests
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.appointment_requests
  add column if not exists checked_in_at timestamptz;

comment on column public.appointment_requests.source is
  'patient_request = inbound queue; provider_scheduled = staff-created in portal.';

-- ========== Laboratory ==========
create table if not exists public.lab_test_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  specimen_type text not null default 'blood',
  unit text,
  reference_range text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index if not exists lab_test_definitions_org_idx
  on public.lab_test_definitions (organization_id)
  where active = true;

drop trigger if exists lab_test_definitions_set_updated_at on public.lab_test_definitions;
create trigger lab_test_definitions_set_updated_at
  before update on public.lab_test_definitions
  for each row
  execute function public.set_updated_at();

create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'ordered'
    check (status in (
      'ordered',
      'sample_collected',
      'processing',
      'awaiting_validation',
      'validated',
      'reported',
      'cancelled'
    )),
  clinical_notes text,
  ordered_by uuid references auth.users (id) on delete set null,
  ordered_at timestamptz not null default now(),
  sample_collected_at timestamptz,
  sample_collected_by uuid references auth.users (id) on delete set null,
  specimen_type text,
  processing_started_at timestamptz,
  validated_at timestamptz,
  validated_by uuid references auth.users (id) on delete set null,
  reported_at timestamptz,
  patient_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_orders_org_status_idx
  on public.lab_orders (organization_id, status, ordered_at desc);

create index if not exists lab_orders_patient_idx
  on public.lab_orders (patient_id, ordered_at desc);

drop trigger if exists lab_orders_set_updated_at on public.lab_orders;
create trigger lab_orders_set_updated_at
  before update on public.lab_orders
  for each row
  execute function public.set_updated_at();

create table if not exists public.lab_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.lab_orders (id) on delete cascade,
  test_definition_id uuid not null
    references public.lab_test_definitions (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  result_value text,
  result_unit text,
  reference_range text,
  result_flag text
    check (result_flag is null or result_flag in ('normal', 'low', 'high', 'critical', 'abnormal')),
  result_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_order_items_order_idx
  on public.lab_order_items (order_id);

drop trigger if exists lab_order_items_set_updated_at on public.lab_order_items;
create trigger lab_order_items_set_updated_at
  before update on public.lab_order_items
  for each row
  execute function public.set_updated_at();

comment on table public.lab_orders is
  'Laboratory capability: order → sample → process → validate → report workflow.';

-- Lab RLS
alter table public.lab_test_definitions enable row level security;
alter table public.lab_orders enable row level security;
alter table public.lab_order_items enable row level security;

drop policy if exists "Org members read lab tests" on public.lab_test_definitions;
create policy "Org members read lab tests"
  on public.lab_test_definitions for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

drop policy if exists "Org writers manage lab tests" on public.lab_test_definitions;
create policy "Org writers manage lab tests"
  on public.lab_test_definitions for all to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

drop policy if exists "Org members read lab orders" on public.lab_orders;
create policy "Org members read lab orders"
  on public.lab_orders for select to authenticated
  using (
    public.is_provider_org_member(organization_id)
    or patient_id = auth.uid()
    or public.is_staff()
  );

drop policy if exists "Org writers manage lab orders" on public.lab_orders;
create policy "Org writers manage lab orders"
  on public.lab_orders for all to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

drop policy if exists "Org members read lab order items" on public.lab_order_items;
create policy "Org members read lab order items"
  on public.lab_order_items for select to authenticated
  using (
    exists (
      select 1 from public.lab_orders o
      where o.id = lab_order_items.order_id
        and (
          public.is_provider_org_member(o.organization_id)
          or o.patient_id = auth.uid()
          or public.is_staff()
        )
    )
  );

drop policy if exists "Org writers manage lab order items" on public.lab_order_items;
create policy "Org writers manage lab order items"
  on public.lab_order_items for all to authenticated
  using (
    exists (
      select 1 from public.lab_orders o
      where o.id = lab_order_items.order_id
        and (public.can_write_provider_org(o.organization_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.lab_orders o
      where o.id = lab_order_items.order_id
        and (public.can_write_provider_org(o.organization_id) or public.is_admin())
    )
  );

grant select, insert, update, delete on public.lab_test_definitions to authenticated;
grant select, insert, update, delete on public.lab_orders to authenticated;
grant select, insert, update, delete on public.lab_order_items to authenticated;
