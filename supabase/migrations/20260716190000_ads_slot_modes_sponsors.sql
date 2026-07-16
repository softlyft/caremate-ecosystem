-- Ads Phase 2: per-slot source modes, verified advertisers, AdMob event metadata.

-- ---------------------------------------------------------------------------
-- Verified advertisers (sponsored inventory)
-- ---------------------------------------------------------------------------
create table if not exists public.ad_advertisers (
  id text primary key,
  name text not null,
  org_type text not null default 'other'
    check (org_type in ('hospital', 'pharmacy', 'laboratory', 'ngo', 'hmo', 'public_health', 'other')),
  website_url text,
  logo_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_advertisers_verification_idx
  on public.ad_advertisers (verification_status)
  where deleted_at is null;

alter table public.ad_advertisers enable row level security;

drop policy if exists "Public read verified ad_advertisers" on public.ad_advertisers;
create policy "Public read verified ad_advertisers"
  on public.ad_advertisers for select
  to anon, authenticated
  using (verification_status = 'verified' and deleted_at is null);

drop policy if exists "Staff read all ad_advertisers" on public.ad_advertisers;
create policy "Staff read all ad_advertisers"
  on public.ad_advertisers for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff insert ad_advertisers" on public.ad_advertisers;
create policy "Staff insert ad_advertisers"
  on public.ad_advertisers for insert
  to authenticated
  with check (public.can_edit_catalog());

drop policy if exists "Staff update ad_advertisers" on public.ad_advertisers;
create policy "Staff update ad_advertisers"
  on public.ad_advertisers for update
  to authenticated
  using (public.can_edit_catalog())
  with check (public.can_edit_catalog());

-- ---------------------------------------------------------------------------
-- Campaigns: link sponsored campaigns to advertisers
-- ---------------------------------------------------------------------------
alter table public.ad_campaigns
  add column if not exists advertiser_id text references public.ad_advertisers (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Events: support AdMob (nullable campaign/creative + unit id)
-- ---------------------------------------------------------------------------
alter table public.ad_events
  alter column campaign_id drop not null;

alter table public.ad_events
  alter column creative_id drop not null;

alter table public.ad_events
  add column if not exists ad_unit_id text;

-- ---------------------------------------------------------------------------
-- Per-slot source mode (off | house | sponsored | admob)
-- ---------------------------------------------------------------------------
insert into public.ad_remote_config (key, value) values
  ('ads.slots.home.feed.mode', 'house'),
  ('ads.slots.learn.list.mode', 'house'),
  ('ads.slots.learn.article_footer.mode', 'house'),
  ('ads.slots.nearby.list.mode', 'house')
on conflict (key) do nothing;

-- Migrate legacy enabled flags → house mode when mode key absent
update public.ad_remote_config
set value = 'house', updated_at = now()
where key = 'ads.slots.home.feed.enabled' and value = 'true'
  and not exists (select 1 from public.ad_remote_config where key = 'ads.slots.home.feed.mode');

update public.ad_remote_config
set value = 'house', updated_at = now()
where key = 'ads.slots.learn.list.enabled' and value = 'true'
  and not exists (select 1 from public.ad_remote_config where key = 'ads.slots.learn.list.mode');

update public.ad_remote_config
set value = 'house', updated_at = now()
where key = 'ads.slots.learn.article_footer.enabled' and value = 'true'
  and not exists (select 1 from public.ad_remote_config where key = 'ads.slots.learn.article_footer.mode');

update public.ad_remote_config
set value = 'house', updated_at = now()
where key = 'ads.slots.nearby.list.enabled' and value = 'true'
  and not exists (select 1 from public.ad_remote_config where key = 'ads.slots.nearby.list.mode');
