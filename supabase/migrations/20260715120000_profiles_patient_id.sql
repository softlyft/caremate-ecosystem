-- CareMate Patient ID: intentional 12-digit unique number on profiles (not minted at signup).

alter table public.profiles
  add column if not exists patient_id text;

-- Enforce format and uniqueness when present.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_patient_id_format'
  ) then
    alter table public.profiles
      add constraint profiles_patient_id_format
      check (patient_id is null or patient_id ~ '^[0-9]{12}$');
  end if;
end $$;

create unique index if not exists profiles_patient_id_uidx
  on public.profiles (patient_id)
  where patient_id is not null;
