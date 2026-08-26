-- Audit log when a practitioner views a patient's emergency card via Patient ID QR.
-- SoftLyft staff only (is_staff) may SELECT. Inserts happen only inside the share RPC.

create table if not exists public.emergency_share_access_logs (
  id uuid primary key default gen_random_uuid(),
  viewed_at timestamptz not null default now(),

  -- Viewer (practitioner / staff)
  viewer_user_id uuid not null references auth.users (id) on delete cascade,
  viewer_email text,
  viewer_full_name text,
  viewer_caremate_id text,
  viewer_is_health_practitioner boolean not null default false,
  viewer_access_basis text not null
    check (viewer_access_basis in ('health_practitioner', 'provider_org_member', 'staff')),

  -- Patient whose emergency card was opened
  patient_user_id uuid not null references auth.users (id) on delete cascade,
  patient_email text,
  patient_full_name text,
  patient_caremate_id text,
  share_token_sha256 text not null,

  -- Snapshot of what was disclosed (or empty card)
  has_emergency_profile boolean not null default false,
  blood_group text,
  genotype text,
  allergies jsonb not null default '[]'::jsonb,
  current_medications jsonb not null default '[]'::jsonb,
  chronic_conditions jsonb not null default '[]'::jsonb,
  preferred_hospital text,
  insurance_provider text,
  notes text,
  emergency_contacts jsonb not null default '[]'::jsonb
);

create index if not exists emergency_share_access_logs_viewed_at_idx
  on public.emergency_share_access_logs (viewed_at desc);

create index if not exists emergency_share_access_logs_viewer_idx
  on public.emergency_share_access_logs (viewer_user_id, viewed_at desc);

create index if not exists emergency_share_access_logs_patient_idx
  on public.emergency_share_access_logs (patient_user_id, viewed_at desc);

comment on table public.emergency_share_access_logs is
  'SoftLyft-only audit of Patient ID QR emergency views: who viewed whom, when, and the disclosed card snapshot.';

alter table public.emergency_share_access_logs enable row level security;

revoke all on public.emergency_share_access_logs from anon, authenticated;
grant select on public.emergency_share_access_logs to authenticated;
grant all on public.emergency_share_access_logs to service_role;

create policy "Staff read emergency share access logs"
  on public.emergency_share_access_logs for select to authenticated
  using (public.is_staff());

-- No INSERT/UPDATE/DELETE policies for authenticated — logging is security-definer only.

create or replace function public.get_emergency_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_token text;
  v_owner uuid;
  v_profile_name text;
  v_patient_caremate_id text;
  v_row public.emergency_profiles%rowtype;
  v_is_practitioner boolean := false;
  v_is_org_member boolean := false;
  v_is_staff boolean := false;
  v_basis text;
  v_viewer_email text;
  v_viewer_name text;
  v_viewer_caremate_id text;
  v_patient_email text;
  v_payload jsonb;
  v_token_hash text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(p.is_health_practitioner, false), p.full_name, p.patient_id
    into v_is_practitioner, v_viewer_name, v_viewer_caremate_id
  from public.profiles p
  where p.user_id = v_uid
  limit 1;

  v_is_org_member := exists (
    select 1
    from public.provider_org_members m
    where m.user_id = v_uid
      and m.deleted_at is null
  );
  v_is_staff := public.is_staff();

  if not coalesce(v_is_practitioner, false)
    and not v_is_org_member
    and not v_is_staff
  then
    raise exception 'Only signed-in health practitioners can view emergency details'
      using errcode = '42501';
  end if;

  if v_is_staff then
    v_basis := 'staff';
  elsif coalesce(v_is_practitioner, false) then
    v_basis := 'health_practitioner';
  else
    v_basis := 'provider_org_member';
  end if;

  select u.email into v_viewer_email
  from auth.users u
  where u.id = v_uid
  limit 1;

  v_token := lower(trim(coalesce(p_token, '')));
  if v_token !~ '^[a-f0-9]{32}$' then
    return jsonb_build_object('found', false);
  end if;

  v_token_hash := encode(digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');

  select p.user_id, p.full_name, p.patient_id
    into v_owner, v_profile_name, v_patient_caremate_id
  from public.profiles p
  where p.emergency_share_token = v_token
  limit 1;

  if v_owner is null then
    return jsonb_build_object('found', false);
  end if;

  select u.email into v_patient_email
  from auth.users u
  where u.id = v_owner
  limit 1;

  select *
    into v_row
  from public.emergency_profiles e
  where e.user_id = v_owner
  limit 1;

  if not found then
    v_payload := jsonb_build_object(
      'found', true,
      'has_profile', false,
      'full_name', coalesce(v_profile_name, ''),
      'blood_group', null,
      'genotype', null,
      'allergies', '[]'::jsonb,
      'current_medications', '[]'::jsonb,
      'chronic_conditions', '[]'::jsonb,
      'preferred_hospital', null,
      'insurance_provider', null,
      'notes', null,
      'emergency_contacts', '[]'::jsonb
    );

    insert into public.emergency_share_access_logs (
      viewer_user_id,
      viewer_email,
      viewer_full_name,
      viewer_caremate_id,
      viewer_is_health_practitioner,
      viewer_access_basis,
      patient_user_id,
      patient_email,
      patient_full_name,
      patient_caremate_id,
      share_token_sha256,
      has_emergency_profile
    ) values (
      v_uid,
      v_viewer_email,
      v_viewer_name,
      v_viewer_caremate_id,
      coalesce(v_is_practitioner, false),
      v_basis,
      v_owner,
      v_patient_email,
      v_profile_name,
      v_patient_caremate_id,
      v_token_hash,
      false
    );

    return v_payload;
  end if;

  v_payload := jsonb_build_object(
    'found', true,
    'has_profile', true,
    'full_name', coalesce(nullif(trim(v_row.full_name), ''), v_profile_name, ''),
    'blood_group', v_row.blood_group,
    'genotype', v_row.genotype,
    'allergies', coalesce(v_row.allergies, '[]'::jsonb),
    'current_medications', coalesce(v_row.current_medications, '[]'::jsonb),
    'chronic_conditions', coalesce(v_row.chronic_conditions, '[]'::jsonb),
    'preferred_hospital', v_row.preferred_hospital,
    'insurance_provider', v_row.insurance_provider,
    'notes', v_row.notes,
    'emergency_contacts', coalesce(v_row.emergency_contacts, '[]'::jsonb)
  );

  insert into public.emergency_share_access_logs (
    viewer_user_id,
    viewer_email,
    viewer_full_name,
    viewer_caremate_id,
    viewer_is_health_practitioner,
    viewer_access_basis,
    patient_user_id,
    patient_email,
    patient_full_name,
    patient_caremate_id,
    share_token_sha256,
    has_emergency_profile,
    blood_group,
    genotype,
    allergies,
    current_medications,
    chronic_conditions,
    preferred_hospital,
    insurance_provider,
    notes,
    emergency_contacts
  ) values (
    v_uid,
    v_viewer_email,
    v_viewer_name,
    v_viewer_caremate_id,
    coalesce(v_is_practitioner, false),
    v_basis,
    v_owner,
    v_patient_email,
    coalesce(nullif(trim(v_row.full_name), ''), v_profile_name),
    v_patient_caremate_id,
    v_token_hash,
    true,
    v_row.blood_group,
    v_row.genotype,
    coalesce(v_row.allergies, '[]'::jsonb),
    coalesce(v_row.current_medications, '[]'::jsonb),
    coalesce(v_row.chronic_conditions, '[]'::jsonb),
    v_row.preferred_hospital,
    v_row.insurance_provider,
    v_row.notes,
    coalesce(v_row.emergency_contacts, '[]'::jsonb)
  );

  return v_payload;
end;
$$;

comment on function public.get_emergency_by_share_token(text) is
  'Returns a narrow emergency card for a Patient ID QR token. Requires signed-in practitioner/staff and writes SoftLyft access audit logs.';

revoke all on function public.get_emergency_by_share_token(text) from public;
grant execute on function public.get_emergency_by_share_token(text) to authenticated;
