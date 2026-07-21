-- External news (Currents) ingested via SoftLyft admin portal.
-- first_seen_at is set once on insert and never moved on re-sync so day
-- bucketing (today / yesterday / 2 days ago) stays stable on devices.

alter table public.articles
  add column if not exists first_seen_at timestamptz;

comment on column public.articles.first_seen_at is
  'First ingest timestamp for external news rows (currents-*). Never updated on re-sync. Null for evergreen CMS content.';

create index if not exists articles_first_seen_at_idx
  on public.articles (first_seen_at desc)
  where first_seen_at is not null and deleted_at is null;
