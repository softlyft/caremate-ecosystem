-- Emergency QR: only signed-in health practitioners (or Care Portal provider staff /
-- SoftLyft staff) may view another patient's medical emergency card.

create or replace function public.get_emergency_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_token text;
  v_owner uuid;
  v_profile_name text;
  v_row public.emergency_profiles%rowtype;
  v_is_practitioner boolean := false;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce(p.is_health_practitioner, false)
    into v_is_practitioner
  from public.profiles p
  where p.user_id = v_uid
  limit 1;

  if not coalesce(v_is_practitioner, false)
    and not exists (
      select 1
      from public.provider_org_members m
      where m.user_id = v_uid
        and m.deleted_at is null
    )
    and not public.is_staff()
  then
    raise exception 'Only signed-in health practitioners can view emergency details'
      using errcode = '42501';
  end if;

  v_token := lower(trim(coalesce(p_token, '')));
  if v_token !~ '^[a-f0-9]{32}$' then
    return jsonb_build_object('found', false);
  end if;

  select p.user_id, p.full_name
    into v_owner, v_profile_name
  from public.profiles p
  where p.emergency_share_token = v_token
  limit 1;

  if v_owner is null then
    return jsonb_build_object('found', false);
  end if;

  select *
    into v_row
  from public.emergency_profiles e
  where e.user_id = v_owner
  limit 1;

  if not found then
    return jsonb_build_object(
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
  end if;

  return jsonb_build_object(
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
end;
$$;

comment on function public.get_emergency_by_share_token(text) is
  'Returns a narrow emergency card for a Patient ID QR token. Requires signed-in health practitioner, Care Portal provider staff, or SoftLyft staff.';

revoke all on function public.get_emergency_by_share_token(text) from public;
grant execute on function public.get_emergency_by_share_token(text) to authenticated;
