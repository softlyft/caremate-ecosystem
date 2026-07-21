-- Flexible chapter geography for African countries with different administrative structures.
-- Country remains relational/required. Lower levels are configured per country and stored as JSONB.

alter table public.community_countries
  add column if not exists administrative_level_config jsonb not null default '[]'::jsonb;

alter table public.community_countries
  drop constraint if exists community_countries_administrative_level_config_array;

alter table public.community_countries
  add constraint community_countries_administrative_level_config_array
  check (jsonb_typeof(administrative_level_config) = 'array');

alter table public.community_chapters
  add column if not exists administrative_hierarchy jsonb not null default '{}'::jsonb;

alter table public.community_chapters
  drop constraint if exists community_chapters_administrative_hierarchy_object;

alter table public.community_chapters
  add constraint community_chapters_administrative_hierarchy_object
  check (jsonb_typeof(administrative_hierarchy) = 'object');

alter table public.community_chapter_requests
  add column if not exists administrative_hierarchy jsonb not null default '{}'::jsonb;

alter table public.community_chapter_requests
  drop constraint if exists community_chapter_requests_administrative_hierarchy_object;

alter table public.community_chapter_requests
  add constraint community_chapter_requests_administrative_hierarchy_object
  check (jsonb_typeof(administrative_hierarchy) = 'object');

-- A GIN index supports containment matching when recommending chapters to members:
-- administrative_hierarchy @> '{"state":"Lagos","local_government":"Yaba"}'.
create index if not exists community_chapters_administrative_hierarchy_idx
  on public.community_chapters using gin (administrative_hierarchy);

update public.community_countries
set administrative_level_config = case code
  when 'NG' then '[
    {"key":"state","label":"State","order":1},
    {"key":"local_government","label":"Local Government Area","short_label":"LGA","order":2}
  ]'::jsonb
  when 'GH' then '[
    {"key":"region","label":"Region","order":1},
    {"key":"district","label":"District","order":2}
  ]'::jsonb
  when 'KE' then '[
    {"key":"county","label":"County","order":1},
    {"key":"sub_county","label":"Sub-county","order":2}
  ]'::jsonb
  when 'ZA' then '[
    {"key":"province","label":"Province","order":1},
    {"key":"district","label":"District Municipality","order":2},
    {"key":"local_municipality","label":"Local Municipality","order":3}
  ]'::jsonb
  when 'EG' then '[
    {"key":"governorate","label":"Governorate","order":1},
    {"key":"district","label":"District","order":2}
  ]'::jsonb
  else administrative_level_config
end
where code in ('NG', 'GH', 'KE', 'ZA', 'EG');

comment on column public.community_countries.administrative_level_config is
  'Ordered JSON array defining optional administrative fields for chapters in this country.';

comment on column public.community_chapters.administrative_hierarchy is
  'Country-specific administrative values keyed by community_countries.administrative_level_config.';
