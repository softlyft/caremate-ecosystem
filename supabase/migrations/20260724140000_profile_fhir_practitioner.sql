-- Phase A: FHIR Patient–oriented profile fields + health-practitioner declaration.

alter table public.profiles
  add column if not exists gender text
    check (gender is null or gender in ('male', 'female', 'other', 'unknown')),
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists national_id text,
  add column if not exists marital_status text
    check (
      marital_status is null
      or marital_status in (
        'single',
        'married',
        'divorced',
        'widowed',
        'separated',
        'domestically_partnered',
        'unknown'
      )
    ),
  add column if not exists is_health_practitioner boolean not null default false;

comment on column public.profiles.gender is 'FHIR Patient.gender';
comment on column public.profiles.address_line is 'FHIR Patient.address.line';
comment on column public.profiles.city is 'FHIR Patient.address.city';
comment on column public.profiles.postal_code is 'FHIR Patient.address.postalCode';
comment on column public.profiles.national_id is
  'National identifier (e.g. Nigeria NIN). Treat as sensitive PII.';
comment on column public.profiles.marital_status is 'FHIR Patient.maritalStatus (simplified code)';
comment on column public.profiles.is_health_practitioner is
  'Self-declared intent to practise; staff elevation is via provider_org_members.';

create index if not exists profiles_is_health_practitioner_idx
  on public.profiles (is_health_practitioner)
  where is_health_practitioner = true;
