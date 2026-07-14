-- Mini-app cloud backup: one JSON snapshot per signed-in user per mini-app.

create table if not exists public.mini_app_snapshots (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  app_key text not null check (app_key in ('medication', 'checkup', 'immunization', 'pregnancy', 'period')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, app_key)
);

alter table public.mini_app_snapshots enable row level security;

drop policy if exists "Users manage own mini_app_snapshots" on public.mini_app_snapshots;

create policy "Users manage own mini_app_snapshots"
  on public.mini_app_snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists mini_app_snapshots_user_id_idx
  on public.mini_app_snapshots (user_id);
