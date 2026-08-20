-- Mark gateway-encrypted PHI on projected timeline rows (title, summary, payload).
alter table public.health_timeline_events
  add column if not exists phi_encrypted_at timestamptz;

comment on column public.health_timeline_events.phi_encrypted_at is
  'Set when the Health Data Gateway last wrote encrypted title/summary/payload.';
