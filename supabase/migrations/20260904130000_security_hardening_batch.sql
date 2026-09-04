-- Security hardening batch (privilege escalation, community inserts, emergency share,
-- community profile SELECT, catalog stub, org entitlement RPC membership).

-- ========== 1. jwt_role: app_metadata only (clients can set user_metadata) ==========
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

comment on function public.jwt_role() is
  'Staff role from JWT app_metadata.role only. Never trust user_metadata (client-writable).';

-- ========== 2. community_notifications: no client inserts ==========
drop policy if exists "System inserts notifications" on public.community_notifications;

revoke insert on public.community_notifications from authenticated, anon;
grant insert on public.community_notifications to service_role;

-- ========== 3. Lock is_health_practitioner to staff ==========
create or replace function public.protect_profile_health_practitioner_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
    and new.is_health_practitioner is distinct from old.is_health_practitioner
    and not public.is_staff()
  then
    new.is_health_practitioner := old.is_health_practitioner;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_health_practitioner on public.profiles;
create trigger profiles_protect_health_practitioner
  before update on public.profiles
  for each row
  execute function public.protect_profile_health_practitioner_flag();

comment on column public.profiles.is_health_practitioner is
  'Staff-managed practitioner flag. Clients cannot change this column (trigger). Used for care-team DM eligibility; emergency share requires org membership or staff.';

-- ========== 4. Emergency share: org member or staff only ==========
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

  -- Self-declared practitioner is not sufficient — require org membership or SoftLyft staff.
  if not v_is_org_member and not v_is_staff then
    raise exception 'Only signed-in provider organization members can view emergency details'
      using errcode = '42501';
  end if;

  if v_is_staff then
    v_basis := 'staff';
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
  'Returns a narrow emergency card for a Patient ID QR token. Requires provider org membership or SoftLyft staff; writes SoftLyft access audit logs.';

revoke all on function public.get_emergency_by_share_token(text) from public;
grant execute on function public.get_emergency_by_share_token(text) to authenticated;

-- ========== 5. Community profiles / badges: chapter-scoped reads ==========
create or replace function public.shares_community_chapter_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships me
    join public.community_memberships them
      on them.chapter_id = me.chapter_id
     and them.status = 'approved'
    where me.user_id = auth.uid()
      and me.status = 'approved'
      and them.user_id = p_other_user_id
  );
$$;

grant execute on function public.shares_community_chapter_with(uuid) to authenticated;

drop policy if exists "Users read community profiles" on public.community_profiles;
create policy "Users read community profiles"
  on public.community_profiles for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.shares_community_chapter_with(user_id)
  );

drop policy if exists "Read user badges" on public.community_user_badges;
create policy "Read user badges"
  on public.community_user_badges for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.shares_community_chapter_with(user_id)
  );

drop policy if exists "Read user certificates" on public.community_user_certificates;
create policy "Read user certificates"
  on public.community_user_certificates for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.shares_community_chapter_with(user_id)
  );

-- ========== 6. Catalog stub: do not overwrite staff name/type ==========
create or replace function public.ensure_provider_catalog_stub(
  p_id text,
  p_name text,
  p_type text,
  p_address text default null,
  p_phone text default null,
  p_email text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_distance_km double precision default null,
  p_attributes jsonb default '{}'::jsonb,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.providers (
    id, name, type, address, phone, email, latitude, longitude, distance_km, attributes, updated_at
  )
  values (
    p_id, p_name, p_type, p_address, p_phone, p_email, p_latitude, p_longitude, p_distance_km,
    coalesce(p_attributes, '{}'::jsonb), coalesce(p_updated_at, now())
  )
  on conflict (id) do update set
    -- Never overwrite non-empty staff-managed identity fields.
    name = case
      when nullif(trim(public.providers.name), '') is null then excluded.name
      else public.providers.name
    end,
    type = case
      when nullif(trim(public.providers.type), '') is null then excluded.type
      else public.providers.type
    end,
    address = coalesce(public.providers.address, excluded.address),
    phone = coalesce(public.providers.phone, excluded.phone),
    email = coalesce(public.providers.email, excluded.email),
    latitude = coalesce(public.providers.latitude, excluded.latitude),
    longitude = coalesce(public.providers.longitude, excluded.longitude),
    distance_km = coalesce(public.providers.distance_km, excluded.distance_km),
    attributes = case
      when public.providers.attributes = '{}'::jsonb then excluded.attributes
      else public.providers.attributes
    end,
    updated_at = greatest(public.providers.updated_at, excluded.updated_at);
end;
$$;

-- ========== 7. Org entitlement RPCs: require membership or staff ==========
create or replace function public.assert_can_read_provider_org_entitlements(p_org_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_org_id is null then
    raise exception 'Organization required' using errcode = '22023';
  end if;
  if public.is_staff() then
    return;
  end if;
  if not public.is_provider_org_member(p_org_id) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_can_read_payer_org_entitlements(p_org_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_org_id is null then
    raise exception 'Organization required' using errcode = '22023';
  end if;
  if public.is_staff() then
    return;
  end if;
  if not public.is_payer_org_member(p_org_id) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;
end;
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

  perform public.assert_can_read_provider_org_entitlements(p_org_id);

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

  perform public.assert_can_read_payer_org_entitlements(p_org_id);

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

-- Wrap count/cap helpers with membership checks (replace SQL bodies with plpgsql).
create or replace function public.provider_org_pct_seat_limit(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_provider_org_entitlements(p_org_id);
  return coalesce((public.provider_org_entitlements(p_org_id) ->> 'pct_seat_limit')::integer, 0);
end;
$$;

create or replace function public.provider_org_patient_connection_cap(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_provider_org_entitlements(p_org_id);
  return coalesce((public.provider_org_entitlements(p_org_id) ->> 'patient_connection_cap')::integer, 0);
end;
$$;

create or replace function public.provider_org_approved_patient_count(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_can_read_provider_org_entitlements(p_org_id);
  select count(*)::integer into v_count
  from public.patient_provider_connections c
  where c.organization_id = p_org_id
    and c.status = 'approved';
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.provider_org_pct_member_count(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_can_read_provider_org_entitlements(p_org_id);
  select count(*)::integer into v_count
  from public.provider_org_members m
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.private_care_team = true;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.provider_org_can_approve_patient(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_provider_org_entitlements(p_org_id);
  return public.provider_org_approved_patient_count(p_org_id)
    < public.provider_org_patient_connection_cap(p_org_id);
end;
$$;

create or replace function public.payer_org_support_team_seat_limit(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_payer_org_entitlements(p_org_id);
  return coalesce((public.payer_org_entitlements(p_org_id) ->> 'support_team_seat_limit')::integer, 0);
end;
$$;

create or replace function public.payer_org_patient_connection_cap(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_payer_org_entitlements(p_org_id);
  return coalesce((public.payer_org_entitlements(p_org_id) ->> 'patient_connection_cap')::integer, 0);
end;
$$;

create or replace function public.payer_org_approved_patient_count(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_can_read_payer_org_entitlements(p_org_id);
  select count(*)::integer into v_count
  from public.patient_payer_connections c
  where c.payer_organization_id = p_org_id
    and c.status = 'approved';
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.payer_org_support_team_member_count(p_org_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_can_read_payer_org_entitlements(p_org_id);
  select count(*)::integer into v_count
  from public.payer_org_members m
  where m.organization_id = p_org_id
    and m.deleted_at is null
    and m.support_team = true;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.payer_org_can_approve_patient(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_can_read_payer_org_entitlements(p_org_id);
  return public.payer_org_approved_patient_count(p_org_id)
    < public.payer_org_patient_connection_cap(p_org_id);
end;
$$;

revoke all on function public.assert_can_read_provider_org_entitlements(uuid) from public, anon, authenticated;
revoke all on function public.assert_can_read_payer_org_entitlements(uuid) from public, anon, authenticated;

-- Community join OTP rate-limit kind
alter table public.provider_auth_otp_sends
  drop constraint if exists provider_auth_otp_sends_kind_check;

alter table public.provider_auth_otp_sends
  add constraint provider_auth_otp_sends_kind_check
  check (kind in ('claim', 'password_reset', 'payer_claim', 'community_join'));
