-- Learn catalog: soft-delete + public read of published content (guests via anon key).

alter table public.articles
  add column if not exists deleted_at timestamptz;

create index if not exists articles_published_at_idx
  on public.articles (published_at)
  where deleted_at is null;

create index if not exists articles_deleted_at_idx
  on public.articles (deleted_at)
  where deleted_at is not null;

-- Replace blanket authenticated read with published (+ tombstones) for devices,
-- and full read for portal staff (drafts / soft-deleted).
drop policy if exists "Authenticated read articles" on public.articles;
drop policy if exists "Public read published articles" on public.articles;
drop policy if exists "Staff read all articles" on public.articles;

-- Guests (anon) and signed-in users: live published rows + tombstones for sync.
create policy "Public read published articles"
  on public.articles for select
  to anon, authenticated
  using (
    (
      published_at is not null
      and deleted_at is null
    )
    or (
      -- Tombstones so clients can drop removed catalog rows from SQLite.
      deleted_at is not null
      and published_at is not null
    )
  );

create policy "Staff read all articles"
  on public.articles for select
  to authenticated
  using (public.is_staff());
