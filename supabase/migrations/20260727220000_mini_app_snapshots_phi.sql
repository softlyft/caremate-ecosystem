-- Mini-app snapshot PHI cutover marker (gateway encrypts leaf values inside payload jsonb).

alter table public.mini_app_snapshots
  add column if not exists phi_encrypted_at timestamptz;

comment on column public.mini_app_snapshots.phi_encrypted_at is
  'Set when the Health Data Gateway last wrote encrypted PHI leaf values inside payload.';
