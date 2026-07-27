-- Allow signed-in users to sync their own in-app inbox rows from the mobile app.
-- Edge/service-role fan-out for other recipients remains unchanged.

alter table public.notifications
  add column if not exists updated_at timestamptz;

update public.notifications
set updated_at = created_at
where updated_at is null;

alter table public.notifications
  alter column updated_at set default now(),
  alter column updated_at set not null;

comment on column public.notifications.updated_at is
  'Last content/read-state change; used for mobile sync merge.';

drop policy if exists "Users insert own notifications" on public.notifications;
create policy "Users insert own notifications"
  on public.notifications for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

grant insert, delete on public.notifications to authenticated;
