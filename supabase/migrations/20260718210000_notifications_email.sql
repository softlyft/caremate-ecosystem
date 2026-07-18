-- Cloud inbox + per-channel delivery audit (Amazon SES / future Expo push).
-- Service role writes fan-out for other users; authenticated users read/update own inbox.

-- ========== notifications (logical inbox item) ==========
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  event_type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info'
    check (severity in ('info', 'important', 'critical')),
  entity_type text,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- One logical notification per user+dedupe; multiple NULLs allowed for one-offs.
create unique index if not exists notifications_user_dedupe_uidx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_user_id_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users update own notifications read_at" on public.notifications;
create policy "Users update own notifications read_at"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts for other users (family request → receiver) use service role only.

-- ========== notification_deliveries ==========
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'push', 'email')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'deferred')),
  provider text check (provider is null or provider in ('expo', 'ses', 'supabase_auth')),
  provider_message_id text,
  error text,
  scheduled_for timestamptz,
  attempt_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries (status, scheduled_for);

alter table public.notification_deliveries enable row level security;

-- Recipients can see delivery status for their own notifications; writes are service role.
drop policy if exists "Users read own notification deliveries" on public.notification_deliveries;
create policy "Users read own notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (
    exists (
      select 1
      from public.notifications n
      where n.id = notification_id
        and n.user_id = auth.uid()
    )
  );

grant select on public.notifications to authenticated;
grant update on public.notifications to authenticated;
grant select on public.notification_deliveries to authenticated;
