-- CareMate Patient ID permanence:
-- 1) Once set on a profile, it cannot be changed to a different value.
-- 2) Account delete may clear it only while tombstoning (deleted_at set);
--    the value is moved to retired_patient_ids so it can never be reissued.
-- 3) Clients can probe availability via is_caremate_patient_id_available.

create table if not exists public.retired_patient_ids (
  patient_id text primary key,
  former_user_id uuid,
  retired_at timestamptz not null default now(),
  constraint retired_patient_ids_format check (patient_id ~ '^[0-9]{12}$')
);

comment on table public.retired_patient_ids is
  'CareMate Patient IDs that were cleared on account deletion and must never be reissued.';

alter table public.retired_patient_ids enable row level security;

create or replace function public.protect_profile_patient_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.patient_id is not null
    and exists (
      select 1
      from public.retired_patient_ids r
      where r.patient_id = new.patient_id
    )
  then
    raise exception 'CareMate Patient ID is retired and cannot be reused'
      using errcode = '23505';
  end if;

  if tg_op = 'UPDATE'
    and old.patient_id is not null
    and new.patient_id is distinct from old.patient_id
  then
    -- Deidentify / tombstone path: clear ID only when marking the profile deleted.
    if new.patient_id is null and new.deleted_at is not null then
      insert into public.retired_patient_ids (patient_id, former_user_id)
      values (old.patient_id, old.user_id)
      on conflict (patient_id) do nothing;
      return new;
    end if;

    raise exception 'CareMate Patient ID is permanent and cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_patient_id on public.profiles;
create trigger profiles_protect_patient_id
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_patient_id();

comment on function public.protect_profile_patient_id() is
  'Locks profiles.patient_id after mint; on delete-tombstone, retires the ID so it cannot be reused.';

create or replace function public.is_caremate_patient_id_available(p_digits text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_digits, '') ~ '^[0-9]{12}$'
    and not exists (
      select 1 from public.profiles p where p.patient_id = p_digits
    )
    and not exists (
      select 1 from public.retired_patient_ids r where r.patient_id = p_digits
    );
$$;

comment on function public.is_caremate_patient_id_available(text) is
  'True when a 12-digit CareMate ID is free on live profiles and not in retired_patient_ids.';

grant execute on function public.is_caremate_patient_id_available(text) to authenticated;
grant execute on function public.is_caremate_patient_id_available(text) to service_role;
