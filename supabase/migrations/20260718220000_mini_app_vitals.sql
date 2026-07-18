-- Widen mini_app_snapshots.app_key to include Vitals.
do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'mini_app_snapshots'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%app_key%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.mini_app_snapshots drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.mini_app_snapshots
  add constraint mini_app_snapshots_app_key_check
  check (app_key in ('vitals', 'medication', 'checkup', 'immunization', 'pregnancy', 'period'));
