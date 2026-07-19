-- CareMate Provider Portal (patient engagement) — org staff membership, connections,
-- broadcasts, documents, appointment requests. Reuses provider_organizations.
-- Patients are auth users (profiles.user_id). Not an HMS/EHR.

-- ========== Organization portal profile ==========
create table if not exists public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique
    references public.provider_organizations (id) on delete cascade,
  -- MVP portal organization type subset (distinct from Nearby catalog `providers.type`)
  organization_type text not null default 'clinic'
    check (organization_type in (
      'hospital',
      'clinic',
      'pharmacy',
      'laboratory',
      'imaging_centre',
      'blood_bank',
      'ambulance',
      'insurance'
    )),
  description text,
  phone text,
  email text,
  website text,
  logo_url text,
  address text,
  opening_hours jsonb not null default '{}'::jsonb,
  emergency_contact text,
  services_offered text[] not null default '{}',
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_profiles_verification_idx
  on public.provider_profiles (verification_status);

-- ========== Org membership / RBAC ==========
create table if not exists public.provider_org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff'
    check (role in ('owner', 'administrator', 'staff', 'viewer')),
  display_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists provider_org_members_user_idx
  on public.provider_org_members (user_id)
  where deleted_at is null;

create index if not exists provider_org_members_org_idx
  on public.provider_org_members (organization_id)
  where deleted_at is null;

-- ========== Patient ↔ Provider connection (CRM contact, not EMR) ==========
create table if not exists public.patient_provider_connections (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  -- Scopes patient has granted (MVP: applied on approve; mobile controls later)
  shared_scopes text[] not null default array['basic', 'emergency']::text[],
  patient_note text,
  provider_note text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, organization_id)
);

create index if not exists patient_provider_connections_org_status_idx
  on public.patient_provider_connections (organization_id, status);

create index if not exists patient_provider_connections_patient_idx
  on public.patient_provider_connections (patient_id);

-- ========== Activity timeline ==========
create table if not exists public.patient_provider_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.patient_provider_connections (id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patient_provider_activities_org_created_idx
  on public.patient_provider_activities (organization_id, created_at desc);

create index if not exists patient_provider_activities_patient_idx
  on public.patient_provider_activities (patient_id, created_at desc);

-- ========== Broadcasts ==========
create table if not exists public.provider_broadcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  title text not null,
  message text not null,
  audience text not null default 'all'
    check (audience in ('all', 'selected')),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'expired')),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_broadcasts_org_created_idx
  on public.provider_broadcasts (organization_id, created_at desc);

create table if not exists public.provider_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null
    references public.provider_broadcasts (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (broadcast_id, patient_id)
);

create index if not exists provider_broadcast_recipients_patient_idx
  on public.provider_broadcast_recipients (patient_id);

-- ========== Documents (storage path in file_url) ==========
create table if not exists public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  patient_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'prescription',
      'lab_result',
      'imaging_report',
      'referral_letter',
      'discharge_summary',
      'invoice'
    )),
  title text not null,
  file_url text not null,
  file_name text,
  mime_type text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_documents_org_patient_idx
  on public.provider_documents (organization_id, patient_id, created_at desc);

create index if not exists provider_documents_patient_idx
  on public.provider_documents (patient_id, created_at desc);

-- ========== Appointment requests (no calendar sync) ==========
create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null
    references public.provider_organizations (id) on delete cascade,
  requested_date date not null,
  requested_time time,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'completed', 'rescheduled')),
  provider_note text,
  rescheduled_date date,
  rescheduled_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_requests_org_status_idx
  on public.appointment_requests (organization_id, status, created_at desc);

create index if not exists appointment_requests_patient_idx
  on public.appointment_requests (patient_id, created_at desc);

-- updated_at triggers (reuse if present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists provider_profiles_set_updated_at on public.provider_profiles;
create trigger provider_profiles_set_updated_at
  before update on public.provider_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists provider_org_members_set_updated_at on public.provider_org_members;
create trigger provider_org_members_set_updated_at
  before update on public.provider_org_members
  for each row execute function public.set_updated_at();

drop trigger if exists patient_provider_connections_set_updated_at on public.patient_provider_connections;
create trigger patient_provider_connections_set_updated_at
  before update on public.patient_provider_connections
  for each row execute function public.set_updated_at();

drop trigger if exists provider_broadcasts_set_updated_at on public.provider_broadcasts;
create trigger provider_broadcasts_set_updated_at
  before update on public.provider_broadcasts
  for each row execute function public.set_updated_at();

drop trigger if exists provider_documents_set_updated_at on public.provider_documents;
create trigger provider_documents_set_updated_at
  before update on public.provider_documents
  for each row execute function public.set_updated_at();

drop trigger if exists appointment_requests_set_updated_at on public.appointment_requests;
create trigger appointment_requests_set_updated_at
  before update on public.appointment_requests
  for each row execute function public.set_updated_at();

-- ========== Storage bucket ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-documents',
  'provider-documents',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {organization_id}/{patient_id}/{document_id}/{filename}
create or replace function public.provider_document_path_org_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;


-- ========== Helpers ==========

create or replace function public.is_provider_org_member(p_org_id uuid)
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
      and m.user_id = auth.uid()
      and m.deleted_at is null
  );
$$;

create or replace function public.provider_org_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.provider_org_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
    and m.deleted_at is null
  limit 1;
$$;

create or replace function public.can_manage_provider_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.provider_org_role(p_org_id), '') in ('owner', 'administrator');
$$;

create or replace function public.can_write_provider_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.provider_org_role(p_org_id), '') in ('owner', 'administrator', 'staff');
$$;

-- ========== RLS ==========
alter table public.provider_profiles enable row level security;
alter table public.provider_org_members enable row level security;
alter table public.patient_provider_connections enable row level security;
alter table public.patient_provider_activities enable row level security;
alter table public.provider_broadcasts enable row level security;
alter table public.provider_broadcast_recipients enable row level security;
alter table public.provider_documents enable row level security;
alter table public.appointment_requests enable row level security;

-- Profiles
create policy "Provider members read own org profile"
  on public.provider_profiles for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider managers update own org profile"
  on public.provider_profiles for update to authenticated
  using (public.can_manage_provider_org(organization_id) or public.is_admin())
  with check (public.can_manage_provider_org(organization_id) or public.is_admin());

create policy "Provider managers insert org profile"
  on public.provider_profiles for insert to authenticated
  with check (public.can_manage_provider_org(organization_id) or public.is_admin());

-- Members
create policy "Members read org membership"
  on public.provider_org_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_provider_org_member(organization_id)
    or public.is_staff()
  );

create policy "Owners manage membership"
  on public.provider_org_members for all to authenticated
  using (
    public.provider_org_role(organization_id) = 'owner'
    or public.is_admin()
  )
  with check (
    public.provider_org_role(organization_id) = 'owner'
    or public.is_admin()
  );

-- Connections
create policy "Patients manage own connection requests"
  on public.patient_provider_connections for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Provider staff read org connections"
  on public.patient_provider_connections for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider staff update org connections"
  on public.patient_provider_connections for update to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

-- Activities
create policy "Patients read own activities"
  on public.patient_provider_activities for select to authenticated
  using (patient_id = auth.uid());

create policy "Provider members read org activities"
  on public.patient_provider_activities for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider staff insert activities"
  on public.patient_provider_activities for insert to authenticated
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

-- Broadcasts
create policy "Provider members read broadcasts"
  on public.provider_broadcasts for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider staff write broadcasts"
  on public.provider_broadcasts for all to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

create policy "Provider members read broadcast recipients"
  on public.provider_broadcast_recipients for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (
      select 1 from public.provider_broadcasts b
      where b.id = broadcast_id
        and (public.is_provider_org_member(b.organization_id) or public.is_staff())
    )
  );

create policy "Patients mark broadcast read"
  on public.provider_broadcast_recipients for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Provider staff insert broadcast recipients"
  on public.provider_broadcast_recipients for insert to authenticated
  with check (
    exists (
      select 1 from public.provider_broadcasts b
      where b.id = broadcast_id
        and (public.can_write_provider_org(b.organization_id) or public.is_admin())
    )
  );

-- Documents
create policy "Patients read own provider documents"
  on public.provider_documents for select to authenticated
  using (patient_id = auth.uid());

create policy "Provider members read org documents"
  on public.provider_documents for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider staff write documents"
  on public.provider_documents for all to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

-- Appointments
create policy "Patients manage own appointment requests"
  on public.appointment_requests for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Provider members read appointments"
  on public.appointment_requests for select to authenticated
  using (public.is_provider_org_member(organization_id) or public.is_staff());

create policy "Provider staff update appointments"
  on public.appointment_requests for update to authenticated
  using (public.can_write_provider_org(organization_id) or public.is_admin())
  with check (public.can_write_provider_org(organization_id) or public.is_admin());

-- Storage policies
create policy "Provider staff upload documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'provider-documents'
    and (
      public.can_write_provider_org(public.provider_document_path_org_id(name))
      or public.is_admin()
    )
  );

create policy "Provider staff read documents storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'provider-documents'
    and (
      public.is_provider_org_member(public.provider_document_path_org_id(name))
      or public.is_staff()
      or split_part(name, '/', 2) = auth.uid()::text
    )
  );

create policy "Provider staff update documents storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'provider-documents'
    and (public.can_write_provider_org(public.provider_document_path_org_id(name)) or public.is_admin())
  );

create policy "Provider staff delete documents storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'provider-documents'
    and (public.can_write_provider_org(public.provider_document_path_org_id(name)) or public.is_admin())
  );

grant execute on function public.is_provider_org_member(uuid) to authenticated;
grant execute on function public.provider_org_role(uuid) to authenticated;
grant execute on function public.can_manage_provider_org(uuid) to authenticated;
grant execute on function public.can_write_provider_org(uuid) to authenticated;
grant execute on function public.provider_document_path_org_id(text) to authenticated;
