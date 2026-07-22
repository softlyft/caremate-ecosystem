-- Device Expo push tokens for signed-in users (guests never upload).

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists notification_devices_user_id_idx
  on public.notification_devices (user_id);

alter table public.notification_devices enable row level security;

drop policy if exists "Users manage own notification_devices" on public.notification_devices;
create policy "Users manage own notification_devices"
  on public.notification_devices
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.notification_devices to authenticated;
