-- Opaque emergency share tokens for Patient ID QR.
-- Viewers must be authenticated; PHI is never embedded in the QR payload.

alter table public.profiles
  add column if not exists emergency_share_token text;

comment on column public.profiles.emergency_share_token is
  'Opaque token for caremate://emergency/share/<token>. Minted with Patient ID.';

create unique index if not exists profiles_emergency_share_token_uidx
  on public.profiles (emergency_share_token)
  where emergency_share_token is not null;

-- Authenticated callers only. Returns a narrow emergency card for the token owner.
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
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
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

revoke all on function public.get_emergency_by_share_token(text) from public;
grant execute on function public.get_emergency_by_share_token(text) to authenticated;
