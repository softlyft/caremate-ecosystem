-- Connection consent: emergency is opt-in by the patient (not automatic on connect).
-- CareMate-defined scopes today: basic (always), emergency (patient-granted).

comment on column public.patient_provider_connections.shared_scopes is
  'Patient-granted share scopes for this connection. basic is always present; emergency requires explicit patient consent.';

-- Strip auto-granted emergency from existing rows so providers lose access until patients consent.
update public.patient_provider_connections
set
  shared_scopes = (
    select coalesce(array_agg(scope order by scope), array['basic']::text[])
    from unnest(shared_scopes) as scope
    where scope is distinct from 'emergency'
  ),
  updated_at = now()
where 'emergency' = any (shared_scopes);

-- Ensure every row still has basic after the strip.
update public.patient_provider_connections
set shared_scopes = array['basic']::text[] || shared_scopes
where not ('basic' = any (shared_scopes));

alter table public.patient_provider_connections
  alter column shared_scopes set default array['basic']::text[];

alter table public.patient_provider_connections
  drop constraint if exists patient_provider_connections_shared_scopes_valid;

alter table public.patient_provider_connections
  add constraint patient_provider_connections_shared_scopes_valid
  check (
    shared_scopes <@ array['basic', 'emergency']::text[]
    and 'basic' = any (shared_scopes)
  );

-- Only the patient may change shared_scopes (provider staff approve/reject status only).
create or replace function public.protect_connection_shared_scopes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.shared_scopes is distinct from old.shared_scopes
    and auth.uid() is distinct from new.patient_id
  then
    raise exception 'Only the patient can change shared_scopes';
  end if;
  return new;
end;
$$;

drop trigger if exists patient_provider_connections_protect_scopes
  on public.patient_provider_connections;

create trigger patient_provider_connections_protect_scopes
  before update on public.patient_provider_connections
  for each row
  execute function public.protect_connection_shared_scopes();
