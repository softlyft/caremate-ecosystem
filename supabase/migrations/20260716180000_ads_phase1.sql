-- Ads Phase 1: remote config (kill switches), house campaigns, creatives,
-- placements, and device event outbox (impressions / clicks).

-- ---------------------------------------------------------------------------
-- Remote config (portal-owned kill switches + mix weights)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_remote_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.ad_remote_config enable row level security;

drop policy if exists "Public read ad_remote_config" on public.ad_remote_config;
create policy "Public read ad_remote_config"
  on public.ad_remote_config for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff upsert ad_remote_config" on public.ad_remote_config;
create policy "Staff upsert ad_remote_config"
  on public.ad_remote_config for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

insert into public.ad_remote_config (key, value) values
  ('ads.enabled', 'true'),
  ('ads.admob.enabled', 'false'),
  ('ads.mix.house_weight', '100'),
  ('ads.mix.admob_weight', '0'),
  ('ads.slots.home.feed.enabled', 'true'),
  ('ads.slots.learn.list.enabled', 'true'),
  ('ads.slots.learn.article_footer.enabled', 'true'),
  ('ads.slots.nearby.list.enabled', 'true')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Campaigns (house now; sponsored later)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_campaigns (
  id text primary key,
  source text not null default 'house'
    check (source in ('house', 'sponsored')),
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  priority integer not null default 0,
  frequency_cap_per_day integer not null default 6,
  starts_at timestamptz,
  ends_at timestamptz,
  country_codes jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_campaigns_status_idx
  on public.ad_campaigns (status)
  where deleted_at is null;

create index if not exists ad_campaigns_deleted_at_idx
  on public.ad_campaigns (deleted_at)
  where deleted_at is not null;

alter table public.ad_campaigns enable row level security;

drop policy if exists "Public read ad_campaigns" on public.ad_campaigns;
create policy "Public read ad_campaigns"
  on public.ad_campaigns for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff write ad_campaigns" on public.ad_campaigns;
create policy "Staff write ad_campaigns"
  on public.ad_campaigns for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ---------------------------------------------------------------------------
-- Creatives
-- ---------------------------------------------------------------------------
create table if not exists public.ad_creatives (
  id text primary key,
  campaign_id text not null references public.ad_campaigns (id) on delete cascade,
  title text not null,
  body text not null,
  cta_label text,
  cta_href text,
  image_url text,
  badge_label text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_creatives_campaign_idx
  on public.ad_creatives (campaign_id)
  where deleted_at is null;

alter table public.ad_creatives enable row level security;

drop policy if exists "Public read ad_creatives" on public.ad_creatives;
create policy "Public read ad_creatives"
  on public.ad_creatives for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff write ad_creatives" on public.ad_creatives;
create policy "Staff write ad_creatives"
  on public.ad_creatives for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ---------------------------------------------------------------------------
-- Placements (campaign ↔ slot)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_placements (
  id text primary key,
  campaign_id text not null references public.ad_campaigns (id) on delete cascade,
  slot_id text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slot_id)
);

create index if not exists ad_placements_slot_idx
  on public.ad_placements (slot_id)
  where deleted_at is null;

alter table public.ad_placements enable row level security;

drop policy if exists "Public read ad_placements" on public.ad_placements;
create policy "Public read ad_placements"
  on public.ad_placements for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff write ad_placements" on public.ad_placements;
create policy "Staff write ad_placements"
  on public.ad_placements for all
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ---------------------------------------------------------------------------
-- Events (device → cloud reporting outbox)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_events (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type in ('impression', 'click')),
  campaign_id text not null,
  creative_id text not null,
  slot_id text not null,
  source text not null default 'house',
  created_at timestamptz not null default now()
);

create index if not exists ad_events_campaign_created_idx
  on public.ad_events (campaign_id, created_at desc);

alter table public.ad_events enable row level security;

drop policy if exists "Users insert own ad_events" on public.ad_events;
create policy "Users insert own ad_events"
  on public.ad_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Anon insert guest ad_events" on public.ad_events;
create policy "Anon insert guest ad_events"
  on public.ad_events for insert
  to anon
  with check (user_id is null);

drop policy if exists "Staff read ad_events" on public.ad_events;
create policy "Staff read ad_events"
  on public.ad_events for select
  to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Seed one active house campaign (welcome / explore CareMate)
-- ---------------------------------------------------------------------------
insert into public.ad_campaigns (
  id, source, name, status, priority, frequency_cap_per_day, country_codes
) values (
  'camp_house_welcome',
  'house',
  'Welcome — explore CareMate',
  'active',
  10,
  4,
  '[]'::jsonb
) on conflict (id) do nothing;

insert into public.ad_creatives (
  id, campaign_id, title, body, cta_label, cta_href, badge_label
) values (
  'cre_house_welcome',
  'camp_house_welcome',
  'Your health tools, in one place',
  'Track meds, find nearby care, keep an offline emergency card, and set up Family when you are ready.',
  'Open Apps',
  '/(app)/(tabs)/apps',
  'From CareMate'
) on conflict (id) do nothing;

insert into public.ad_placements (id, campaign_id, slot_id) values
  ('plc_welcome_home', 'camp_house_welcome', 'home.feed'),
  ('plc_welcome_learn', 'camp_house_welcome', 'learn.list'),
  ('plc_welcome_nearby', 'camp_house_welcome', 'nearby.list')
on conflict (campaign_id, slot_id) do nothing;
