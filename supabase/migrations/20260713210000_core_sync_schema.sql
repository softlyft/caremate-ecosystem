-- CareMate core cloud schema aligned with SQLite domain sync payloads.
-- Device-only tables (sync_queue, sync_metadata) stay on SQLite and are never mirrored.

-- ========== profiles ==========
create table if not exists public.profiles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  date_of_birth text,
  avatar_url text,
  country_code text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.profiles enable row level security;

drop policy if exists "Users manage own profiles" on public.profiles;
create policy "Users manage own profiles"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ========== settings ==========
create table if not exists public.settings (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  subscribed_category_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.settings enable row level security;

drop policy if exists "Users manage own settings" on public.settings;
create policy "Users manage own settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists settings_user_id_idx on public.settings (user_id);

-- ========== emergency_profiles ==========
create table if not exists public.emergency_profiles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  photo_url text,
  blood_group text,
  genotype text,
  allergies jsonb not null default '[]'::jsonb,
  current_medications jsonb not null default '[]'::jsonb,
  chronic_conditions jsonb not null default '[]'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  preferred_hospital text,
  insurance_provider text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.emergency_profiles enable row level security;

drop policy if exists "Users manage own emergency_profiles" on public.emergency_profiles;
create policy "Users manage own emergency_profiles"
  on public.emergency_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists emergency_profiles_user_id_idx on public.emergency_profiles (user_id);

-- ========== providers (shared catalog) ==========
create table if not exists public.providers (
  id text primary key,
  name text not null,
  type text not null,
  address text,
  phone text,
  email text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.providers enable row level security;

-- Catalog is readable by authenticated users; writes are service/admin or seed jobs.
drop policy if exists "Authenticated read providers" on public.providers;
create policy "Authenticated read providers"
  on public.providers for select
  to authenticated
  using (true);

drop policy if exists "Authenticated upsert providers" on public.providers;
create policy "Authenticated upsert providers"
  on public.providers for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated update providers" on public.providers;
create policy "Authenticated update providers"
  on public.providers for update
  to authenticated
  using (true)
  with check (true);

-- ========== provider_favorites (per-user) ==========
-- No FK to providers: local seeds may favorite rows not yet present in remote catalog.
create table if not exists public.provider_favorites (
  provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_favorite boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (provider_id, user_id)
);

alter table public.provider_favorites enable row level security;

drop policy if exists "Users manage own provider_favorites" on public.provider_favorites;
create policy "Users manage own provider_favorites"
  on public.provider_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists provider_favorites_user_id_idx on public.provider_favorites (user_id);

-- ========== articles (learn content catalog) ==========
create table if not exists public.articles (
  id text primary key,
  title text not null,
  summary text,
  content text not null,
  content_type text not null default 'article',
  category_id text not null,
  category_name text not null,
  image_url text,
  source_url text,
  published_at timestamptz,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

drop policy if exists "Authenticated read articles" on public.articles;
create policy "Authenticated read articles"
  on public.articles for select
  to authenticated
  using (true);

drop policy if exists "Authenticated upsert articles" on public.articles;
create policy "Authenticated insert articles"
  on public.articles for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated update articles" on public.articles;
create policy "Authenticated update articles"
  on public.articles for update
  to authenticated
  using (true)
  with check (true);

create index if not exists articles_content_type_idx on public.articles (content_type);
create index if not exists articles_category_id_idx on public.articles (category_id);

-- ========== bookmarks ==========
-- No FK to articles: Currents/evergreen rows may exist only on device (articles push is no-op).
create table if not exists public.bookmarks (
  id text primary key,
  article_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, article_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "Users manage own bookmarks" on public.bookmarks;
create policy "Users manage own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);

-- mini_app_snapshots already created in 20260713195606_mini_app_snapshots.sql
