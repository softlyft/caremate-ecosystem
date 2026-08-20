-- Health timeline event rows (projected from mini-app snapshots) and dated
-- health_timeline consent. Providers may SELECT events only inside the frozen
-- grant window; they never read mini_app_snapshots.

-- ========== Catalog ==========
insert into public.consent_definitions (
  code,
  organization_id,
  source,
  fhir_scope,
  fhir_category,
  fhir_policy_rule,
  data_class,
  title,
  description,
  active
)
select
  'health_timeline',
  null,
  'system',
  'patient-privacy',
  jsonb_build_object(
    'coding',
    jsonb_build_array(
      jsonb_build_object(
        'system', 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        'code', 'patient-privacy'
      )
    ),
    'text', 'Privacy Consent'
  ),
  'OPTIN',
  'health_timeline',
  'Health timeline',
  'View-only logs from CareMate health apps for a date range you choose. Not a file export. You can revoke anytime.',
  true
where not exists (
  select 1 from public.consent_definitions d
  where d.code = 'health_timeline' and d.organization_id is null
);

-- ========== Dated consent window ==========
alter table public.patient_provider_consents
  add column if not exists period_start date;

alter table public.patient_provider_consents
  add column if not exists period_end date;

alter table public.patient_provider_consents
  drop constraint if exists patient_provider_consents_period_window;

alter table public.patient_provider_consents
  add constraint patient_provider_consents_period_window
  check (
    (period_start is null and period_end is null)
    or (
      period_start is not null
      and period_end is not null
      and period_end >= period_start
    )
  );

comment on column public.patient_provider_consents.period_start is
  'Inclusive start of a frozen share window (required for active health_timeline grants).';

comment on column public.patient_provider_consents.period_end is
  'Inclusive end of a frozen share window (required for active health_timeline grants).';

create or replace function public.enforce_health_timeline_consent_period()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_code text;
begin
  select d.code into v_code
  from public.consent_definitions d
  where d.id = new.definition_id;

  if v_code = 'health_timeline'
    and new.status = 'active'
    and new.provision_type = 'permit'
  then
    if new.period_start is null or new.period_end is null then
      raise exception 'health_timeline consent requires period_start and period_end';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists patient_provider_consents_health_timeline_period
  on public.patient_provider_consents;

create trigger patient_provider_consents_health_timeline_period
  before insert or update on public.patient_provider_consents
  for each row
  execute function public.enforce_health_timeline_consent_period();

-- ========== Event table ==========
create table if not exists public.health_timeline_events (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  app_key text not null
    check (app_key in (
      'vitals',
      'medication',
      'pregnancy',
      'period',
      'immunization',
      'checkup'
    )),
  kind text not null
    check (kind in (
      'vital',
      'med_dose',
      'pregnancy_log',
      'tt_dose',
      'period_day',
      'vaccine',
      'checkup'
    )),
  occurred_on date not null,
  occurred_at timestamptz,
  title text not null default '',
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_timeline_events_user_occurred_idx
  on public.health_timeline_events (user_id, occurred_on desc, occurred_at desc);

create index if not exists health_timeline_events_user_app_idx
  on public.health_timeline_events (user_id, app_key);

comment on table public.health_timeline_events is
  'Projected mini-app log rows for the Health Timeline. Not the Zustand snapshot blob.';

drop trigger if exists health_timeline_events_set_updated_at on public.health_timeline_events;
create trigger health_timeline_events_set_updated_at
  before update on public.health_timeline_events
  for each row
  execute function public.set_updated_at();

alter table public.health_timeline_events enable row level security;

drop policy if exists "Users manage own health_timeline_events"
  on public.health_timeline_events;
create policy "Users manage own health_timeline_events"
  on public.health_timeline_events for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Org staff may read a row only with an active health_timeline permit whose
-- frozen dates cover occurred_on. Join the consent row — do not trust shared_scopes alone.
drop policy if exists "Provider members read consented health timeline events"
  on public.health_timeline_events;
create policy "Provider members read consented health timeline events"
  on public.health_timeline_events for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.patient_provider_consents ppc
      join public.consent_definitions d on d.id = ppc.definition_id
      join public.patient_provider_connections c on c.id = ppc.connection_id
      where ppc.patient_id = health_timeline_events.user_id
        and ppc.organization_id = c.organization_id
        and ppc.status = 'active'
        and ppc.provision_type = 'permit'
        and d.code = 'health_timeline'
        and d.active = true
        and c.status = 'approved'
        and c.patient_id = ppc.patient_id
        and public.is_provider_org_member(ppc.organization_id)
        and ppc.period_start is not null
        and ppc.period_end is not null
        and health_timeline_events.occurred_on >= ppc.period_start
        and health_timeline_events.occurred_on <= ppc.period_end
    )
  );

grant select, insert, update, delete on public.health_timeline_events to authenticated;
