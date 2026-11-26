-- Local daily insight reminder preference (device schedules at 08:00; no remote tip push).
alter table public.settings
  add column if not exists daily_tip_reminders_enabled boolean not null default true;
