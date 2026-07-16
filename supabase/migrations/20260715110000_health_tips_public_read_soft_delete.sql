-- Health tips: soft-delete + public read (guests via anon key), matching Learn articles pattern.

alter table public.health_tips
  add column if not exists deleted_at timestamptz;

create index if not exists health_tips_deleted_at_idx
  on public.health_tips (deleted_at)
  where deleted_at is not null;

drop policy if exists "Authenticated read health_tips" on public.health_tips;
drop policy if exists "Public read health_tips" on public.health_tips;
drop policy if exists "Staff read all health_tips" on public.health_tips;

-- Guests and signed-in users may read the full tip catalog (incl. inactive +
-- soft-delete tombstones). Clients filter is_active / deleted_at locally.
create policy "Public read health_tips"
  on public.health_tips for select
  to anon, authenticated
  using (true);

create policy "Staff read all health_tips"
  on public.health_tips for select
  to authenticated
  using (public.is_staff());
