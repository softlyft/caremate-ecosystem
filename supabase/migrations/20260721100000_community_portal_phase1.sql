-- CareMate Community Portal Phase 1 — chapters, memberships, events, recognition, resources.

-- ========== Geo hierarchy ==========
create table if not exists public.community_countries (
  code text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_states (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.community_countries (code) on delete cascade,
  code text not null,
  name text not null,
  unique (country_code, code)
);

create table if not exists public.community_cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.community_states (id) on delete cascade,
  name text not null,
  unique (state_id, name)
);

create index if not exists community_states_country_idx on public.community_states (country_code);
create index if not exists community_cities_state_idx on public.community_cities (state_id);

-- Seed Africa focus (expandable)
insert into public.community_countries (code, name) values
  ('NG', 'Nigeria'),
  ('GH', 'Ghana'),
  ('KE', 'Kenya'),
  ('ZA', 'South Africa'),
  ('EG', 'Egypt')
on conflict (code) do nothing;

insert into public.community_states (country_code, code, name)
select v.country_code, v.code, v.name
from (values
  ('NG', 'LA', 'Lagos'),
  ('NG', 'RV', 'Rivers'),
  ('NG', 'OY', 'Oyo'),
  ('NG', 'FC', 'FCT'),
  ('GH', 'GA', 'Greater Accra'),
  ('KE', '30', 'Nairobi')
) as v(country_code, code, name)
where not exists (
  select 1 from public.community_states s
  where s.country_code = v.country_code and s.code = v.code
);

insert into public.community_cities (state_id, name)
select s.id, v.city_name
from (values
  ('NG', 'LA', 'Yaba'),
  ('NG', 'LA', 'Ikeja'),
  ('NG', 'RV', 'Port Harcourt'),
  ('NG', 'OY', 'Ibadan'),
  ('NG', 'FC', 'Abuja'),
  ('GH', 'GA', 'Accra'),
  ('KE', '30', 'Nairobi')
) as v(country_code, state_code, city_name)
join public.community_states s on s.country_code = v.country_code and s.code = v.state_code
where not exists (
  select 1 from public.community_cities c
  where c.state_id = s.id and c.name = v.city_name
);

-- ========== Profiles ==========
create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  photo_url text,
  full_name text not null,
  phone text,
  bio text,
  profession text,
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  country_code text references public.community_countries (code),
  state_id uuid references public.community_states (id),
  city_id uuid references public.community_cities (id),
  contributor_category text
    check (contributor_category is null or contributor_category in (
      'community_champion',
      'health_contributor',
      'builder_network',
      'partner_champion'
    )),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== Chapters ==========
create table if not exists public.community_chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  chapter_type text not null default 'community'
    check (chapter_type in ('campus', 'city', 'community', 'organization', 'healthcare_partner')),
  country_code text not null references public.community_countries (code),
  state_id uuid references public.community_states (id),
  city_id uuid references public.community_cities (id),
  lead_user_id uuid references auth.users (id) on delete set null,
  deputy_user_id uuid references auth.users (id) on delete set null,
  cover_image_url text,
  logo_url text,
  member_count integer not null default 0,
  achievements jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_chapters_status_idx on public.community_chapters (status);
create index if not exists community_chapters_country_idx on public.community_chapters (country_code);
create index if not exists community_chapters_city_idx on public.community_chapters (city_id);

-- ========== Chapter creation requests ==========
create table if not exists public.community_chapter_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  chapter_type text not null default 'community'
    check (chapter_type in ('campus', 'city', 'community', 'organization', 'healthcare_partner')),
  country_code text not null references public.community_countries (code),
  state_id uuid references public.community_states (id),
  city_id uuid references public.community_cities (id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_chapter_id uuid references public.community_chapters (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== Memberships ==========
create table if not exists public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.community_chapters (id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'lead', 'deputy')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

-- One approved primary chapter per user
create unique index if not exists community_memberships_one_approved_user_idx
  on public.community_memberships (user_id)
  where status = 'approved';

create index if not exists community_memberships_chapter_status_idx
  on public.community_memberships (chapter_id, status);

-- ========== Events ==========
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.community_chapters (id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer,
  registration_deadline timestamptz,
  banner_url text,
  registration_open boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_events_chapter_starts_idx
  on public.community_events (chapter_id, starts_at);

create table if not exists public.community_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'cancelled', 'attended', 'no_show')),
  registered_at timestamptz not null default now(),
  attended_at timestamptz,
  unique (event_id, user_id)
);

create index if not exists community_event_registrations_event_idx
  on public.community_event_registrations (event_id, status);

-- ========== Announcements ==========
create table if not exists public.community_announcements (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.community_chapters (id) on delete cascade,
  title text not null,
  body text not null,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_announcements_chapter_idx
  on public.community_announcements (chapter_id, published_at desc);

create table if not exists public.community_announcement_reactions (
  announcement_id uuid not null references public.community_announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null default 'like'
    check (reaction in ('like', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table if not exists public.community_announcement_bookmarks (
  announcement_id uuid not null references public.community_announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ========== Resources ==========
create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.community_chapters (id) on delete cascade,
  title text not null,
  description text,
  tags text[] not null default '{}',
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  is_global boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_resources_search_idx
  on public.community_resources using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ========== Recognition catalog ==========
create table if not exists public.community_badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon_url text,
  points_value integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.community_certificates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  template_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.community_user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id uuid not null references public.community_badges (id) on delete cascade,
  awarded_by uuid references auth.users (id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table if not exists public.community_user_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  certificate_id uuid not null references public.community_certificates (id) on delete cascade,
  certificate_url text,
  awarded_by uuid references auth.users (id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, certificate_id)
);

-- ========== Contributions ==========
create table if not exists public.community_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid references public.community_chapters (id) on delete set null,
  action_type text not null,
  description text,
  points integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists community_contributions_user_idx
  on public.community_contributions (user_id, created_at desc);

create index if not exists community_contributions_chapter_idx
  on public.community_contributions (chapter_id, created_at desc);

-- ========== Gallery ==========
create table if not exists public.community_gallery_items (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.community_chapters (id) on delete cascade,
  image_url text not null,
  caption text,
  event_id uuid references public.community_events (id) on delete set null,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists community_gallery_chapter_idx
  on public.community_gallery_items (chapter_id, created_at desc);

-- ========== Notifications ==========
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists community_notifications_user_idx
  on public.community_notifications (user_id, created_at desc);

-- ========== Leaderboard view ==========
create or replace view public.community_leaderboard_points as
select
  c.user_id,
  c.chapter_id,
  ch.country_code,
  coalesce(sum(c.points), 0)::bigint as total_points
from public.community_contributions c
left join public.community_chapters ch on ch.id = c.chapter_id
group by c.user_id, c.chapter_id, ch.country_code;

-- Seed starter badges
insert into public.community_badges (slug, name, description, points_value) values
  ('welcome', 'Welcome Contributor', 'Completed community onboarding', 10),
  ('first_event', 'Event Participant', 'Registered for your first event', 15),
  ('community_builder', 'Community Builder', 'Active chapter contributor', 25)
on conflict (slug) do nothing;

-- ========== Member count trigger ==========
create or replace function public.community_refresh_chapter_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.community_chapters
    set member_count = (
      select count(*) from public.community_memberships m
      where m.chapter_id = old.chapter_id and m.status = 'approved'
    ),
    updated_at = now()
    where id = old.chapter_id;
    return old;
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status or new.chapter_id is distinct from old.chapter_id then
    update public.community_chapters
    set member_count = (
      select count(*) from public.community_memberships m
      where m.chapter_id = coalesce(new.chapter_id, old.chapter_id) and m.status = 'approved'
    ),
    updated_at = now()
    where id = coalesce(new.chapter_id, old.chapter_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists community_memberships_count_trg on public.community_memberships;
create trigger community_memberships_count_trg
  after insert or update or delete on public.community_memberships
  for each row execute function public.community_refresh_chapter_member_count();

-- ========== Storage buckets ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('community-avatars', 'community-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('community-chapter-media', 'community-chapter-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('community-event-banners', 'community-event-banners', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('community-resources', 'community-resources', false, 52428800, null),
  ('community-certificates', 'community-certificates', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ========== RLS helpers ==========
create or replace function public.is_community_member(p_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_memberships m
    where m.chapter_id = p_chapter_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
  );
$$;

create or replace function public.community_chapter_role(p_chapter_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.community_memberships m
  where m.chapter_id = p_chapter_id
    and m.user_id = auth.uid()
    and m.status = 'approved'
  limit 1;
$$;

create or replace function public.is_community_leader(p_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.community_chapter_role(p_chapter_id), '') in ('lead', 'deputy');
$$;

create or replace function public.can_manage_community_chapter(p_chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_community_leader(p_chapter_id) or public.is_staff();
$$;

-- ========== Enable RLS ==========
alter table public.community_countries enable row level security;
alter table public.community_states enable row level security;
alter table public.community_cities enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_chapters enable row level security;
alter table public.community_chapter_requests enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_events enable row level security;
alter table public.community_event_registrations enable row level security;
alter table public.community_announcements enable row level security;
alter table public.community_announcement_reactions enable row level security;
alter table public.community_announcement_bookmarks enable row level security;
alter table public.community_resources enable row level security;
alter table public.community_badges enable row level security;
alter table public.community_certificates enable row level security;
alter table public.community_user_badges enable row level security;
alter table public.community_user_certificates enable row level security;
alter table public.community_contributions enable row level security;
alter table public.community_gallery_items enable row level security;
alter table public.community_notifications enable row level security;

-- Geo: public read
create policy "Anyone reads community countries" on public.community_countries for select to authenticated using (true);
create policy "Anyone reads community states" on public.community_states for select to authenticated using (true);
create policy "Anyone reads community cities" on public.community_cities for select to authenticated using (true);
create policy "Staff manages community countries" on public.community_countries for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff manages community states" on public.community_states for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff manages community cities" on public.community_cities for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Profiles
create policy "Users read community profiles" on public.community_profiles for select to authenticated using (true);
create policy "Users manage own community profile" on public.community_profiles for all to authenticated
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- Chapters
create policy "Read active community chapters" on public.community_chapters for select to authenticated
  using (status = 'active' or public.is_staff() or public.is_community_member(id));
create policy "Staff manages community chapters" on public.community_chapters for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "Leaders update own chapter" on public.community_chapters for update to authenticated
  using (public.can_manage_community_chapter(id)) with check (public.can_manage_community_chapter(id));

-- Chapter requests
create policy "Users read own chapter requests" on public.community_chapter_requests for select to authenticated
  using (requested_by = auth.uid() or public.is_staff());
create policy "Users create chapter requests" on public.community_chapter_requests for insert to authenticated
  with check (requested_by = auth.uid());
create policy "Staff manages chapter requests" on public.community_chapter_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Memberships
create policy "Read memberships in chapter" on public.community_memberships for select to authenticated
  using (user_id = auth.uid() or public.is_community_member(chapter_id) or public.is_staff());
create policy "Users request membership" on public.community_memberships for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and status = 'pending');
create policy "Leaders manage memberships" on public.community_memberships for update to authenticated
  using (public.can_manage_community_chapter(chapter_id) or public.is_staff())
  with check (public.can_manage_community_chapter(chapter_id) or public.is_staff());

-- Events
create policy "Members read chapter events" on public.community_events for select to authenticated
  using (public.is_community_member(chapter_id) or public.is_staff());
create policy "Leaders manage events" on public.community_events for all to authenticated
  using (public.can_manage_community_chapter(chapter_id) or public.is_staff())
  with check (public.can_manage_community_chapter(chapter_id) or public.is_staff());

-- Event registrations
create policy "Read event registrations" on public.community_event_registrations for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_community_chapter((select e.chapter_id from public.community_events e where e.id = event_id))
    or public.is_staff()
  );
create policy "Users register for events" on public.community_event_registrations for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.community_events e
      where e.id = event_id and public.is_community_member(e.chapter_id)
    )
  );
create policy "Users cancel own registration" on public.community_event_registrations for update to authenticated
  using (user_id = auth.uid() or public.can_manage_community_chapter((select e.chapter_id from public.community_events e where e.id = event_id)) or public.is_staff())
  with check (user_id = auth.uid() or public.can_manage_community_chapter((select e.chapter_id from public.community_events e where e.id = event_id)) or public.is_staff());

-- Announcements
create policy "Members read announcements" on public.community_announcements for select to authenticated
  using (public.is_community_member(chapter_id) or public.is_staff());
create policy "Leaders manage announcements" on public.community_announcements for all to authenticated
  using (public.can_manage_community_chapter(chapter_id) or public.is_staff())
  with check (public.can_manage_community_chapter(chapter_id) or public.is_staff());

create policy "Members react to announcements" on public.community_announcement_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Members bookmark announcements" on public.community_announcement_bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Resources
create policy "Read community resources" on public.community_resources for select to authenticated
  using (is_global or chapter_id is null or public.is_community_member(chapter_id) or public.is_staff());
create policy "Leaders upload chapter resources" on public.community_resources for insert to authenticated
  with check (chapter_id is null and public.is_staff() or public.can_manage_community_chapter(chapter_id));
create policy "Staff manages resources" on public.community_resources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Badges / certificates catalog
create policy "Read active badges" on public.community_badges for select to authenticated using (is_active or public.is_staff());
create policy "Staff manages badges" on public.community_badges for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Read active certificates" on public.community_certificates for select to authenticated using (is_active or public.is_staff());
create policy "Staff manages certificates" on public.community_certificates for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Read user badges" on public.community_user_badges for select to authenticated using (true);
create policy "Staff awards badges" on public.community_user_badges for insert to authenticated with check (public.is_staff());
create policy "Read user certificates" on public.community_user_certificates for select to authenticated using (true);
create policy "Staff awards certificates" on public.community_user_certificates for insert to authenticated with check (public.is_staff());

-- Contributions
create policy "Read contributions" on public.community_contributions for select to authenticated
  using (user_id = auth.uid() or public.is_community_member(chapter_id) or public.is_staff());
create policy "Record contributions" on public.community_contributions for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.can_manage_community_chapter(chapter_id)
    or public.is_staff()
  );

-- Gallery
create policy "Members read gallery" on public.community_gallery_items for select to authenticated
  using (public.is_community_member(chapter_id) or public.is_staff());
create policy "Leaders manage gallery" on public.community_gallery_items for all to authenticated
  using (public.can_manage_community_chapter(chapter_id) or public.is_staff())
  with check (public.can_manage_community_chapter(chapter_id) or public.is_staff());

-- Notifications
create policy "Users read own notifications" on public.community_notifications for select to authenticated using (user_id = auth.uid());
create policy "Users update own notifications" on public.community_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "System inserts notifications" on public.community_notifications for insert to authenticated with check (true);

grant select on public.community_leaderboard_points to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.community_chapter_role(uuid) to authenticated;
grant execute on function public.is_community_leader(uuid) to authenticated;
grant execute on function public.can_manage_community_chapter(uuid) to authenticated;
