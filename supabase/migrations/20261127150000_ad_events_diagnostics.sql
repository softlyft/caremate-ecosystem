-- AdMob / catalog diagnostics: request, load_error, skip + optional detail message.
-- Guests already INSERT via "Anon insert guest ad_events" when user_id is null.

alter table public.ad_events
  drop constraint if exists ad_events_event_type_check;

alter table public.ad_events
  add constraint ad_events_event_type_check
  check (event_type in ('impression', 'click', 'request', 'load_error', 'skip'));

alter table public.ad_events
  add column if not exists detail text;

comment on column public.ad_events.detail is
  'Optional reason or SDK error for request / load_error / skip events';
