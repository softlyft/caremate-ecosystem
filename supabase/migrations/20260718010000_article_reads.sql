-- article_reads: track in-progress and completed article reading (mirrors bookmarks sync).
-- No FK to articles: Currents/evergreen rows may exist only on device.

create table if not exists public.article_reads (
  id text primary key,
  article_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('reading', 'read')),
  opened_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, article_id)
);

alter table public.article_reads enable row level security;

drop policy if exists "Users manage own article_reads" on public.article_reads;
create policy "Users manage own article_reads"
  on public.article_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists article_reads_user_id_idx on public.article_reads (user_id);
create index if not exists article_reads_user_status_idx on public.article_reads (user_id, status);
