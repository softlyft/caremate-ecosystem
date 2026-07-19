-- Patient self-upload for provider_documents; optional organization link later.
-- When linked + approved connection, org staff can read the document.

-- Safe path helper (first segment may be "patient" not a uuid)
create or replace function public.provider_document_path_org_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

alter table public.provider_documents
  alter column organization_id drop not null;

alter table public.provider_documents
  add column if not exists source text not null default 'provider';

alter table public.provider_documents
  drop constraint if exists provider_documents_source_check;

alter table public.provider_documents
  add constraint provider_documents_source_check
  check (source in ('provider', 'patient'));

-- Provider uploads must still belong to an org
alter table public.provider_documents
  drop constraint if exists provider_documents_provider_requires_org;

alter table public.provider_documents
  add constraint provider_documents_provider_requires_org
  check (source <> 'provider' or organization_id is not null);

comment on column public.provider_documents.source is
  'provider = uploaded by org staff; patient = uploaded in CareMate app (org optional).';

-- Providers only see org docs they uploaded, or patient docs linked to an approved connection
drop policy if exists "Provider members read org documents"
  on public.provider_documents;
create policy "Provider members read org documents"
  on public.provider_documents for select to authenticated
  using (
    public.is_staff()
    or (
      organization_id is not null
      and public.is_provider_org_member(organization_id)
      and (
        source = 'provider'
        or exists (
          select 1
          from public.patient_provider_connections c
          where c.organization_id = provider_documents.organization_id
            and c.patient_id = provider_documents.patient_id
            and c.status = 'approved'
        )
      )
    )
  );

-- Provider staff write stays scoped to their org (provider-sourced rows)
drop policy if exists "Provider staff write documents"
  on public.provider_documents;
create policy "Provider staff write documents"
  on public.provider_documents for all to authenticated
  using (
    organization_id is not null
    and (public.can_write_provider_org(organization_id) or public.is_admin())
  )
  with check (
    organization_id is not null
    and (public.can_write_provider_org(organization_id) or public.is_admin())
    and source = 'provider'
  );

-- Patients manage their own uploads (insert + update org/title/type, not provider rows' content arbitrarily)
drop policy if exists "Patients insert own documents"
  on public.provider_documents;
create policy "Patients insert own documents"
  on public.provider_documents for insert to authenticated
  with check (
    patient_id = auth.uid()
    and source = 'patient'
    and uploaded_by = auth.uid()
    and (
      organization_id is null
      or exists (
        select 1
        from public.patient_provider_connections c
        where c.organization_id = provider_documents.organization_id
          and c.patient_id = auth.uid()
          and c.status = 'approved'
      )
    )
  );

drop policy if exists "Patients update own patient documents"
  on public.provider_documents;
create policy "Patients update own patient documents"
  on public.provider_documents for update to authenticated
  using (patient_id = auth.uid() and source = 'patient')
  with check (
    patient_id = auth.uid()
    and source = 'patient'
    and (
      organization_id is null
      or exists (
        select 1
        from public.patient_provider_connections c
        where c.organization_id = organization_id
          and c.patient_id = auth.uid()
          and c.status = 'approved'
      )
    )
  );

drop policy if exists "Patients delete own patient documents"
  on public.provider_documents;
create policy "Patients delete own patient documents"
  on public.provider_documents for delete to authenticated
  using (patient_id = auth.uid() and source = 'patient');

-- Storage: patient upload under patient/{user_id}/{document_id}/...
drop policy if exists "Patients upload own documents storage"
  on storage.objects;
create policy "Patients upload own documents storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'provider-documents'
    and split_part(name, '/', 1) = 'patient'
    and split_part(name, '/', 2) = auth.uid()::text
  );

drop policy if exists "Patients delete own documents storage"
  on storage.objects;
create policy "Patients delete own documents storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'provider-documents'
    and split_part(name, '/', 1) = 'patient'
    and split_part(name, '/', 2) = auth.uid()::text
  );

-- Org staff can read storage for linked patient docs (path may be patient/{uid}/...)
drop policy if exists "Provider staff read documents storage"
  on storage.objects;
create policy "Provider staff read documents storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'provider-documents'
    and (
      public.is_staff()
      or split_part(name, '/', 2) = auth.uid()::text
      or (
        public.provider_document_path_org_id(name) is not null
        and public.is_provider_org_member(public.provider_document_path_org_id(name))
      )
      or exists (
        select 1
        from public.provider_documents d
        where d.file_url = name
          and d.organization_id is not null
          and public.is_provider_org_member(d.organization_id)
          and (
            d.source = 'provider'
            or exists (
              select 1
              from public.patient_provider_connections c
              where c.organization_id = d.organization_id
                and c.patient_id = d.patient_id
                and c.status = 'approved'
            )
          )
      )
    )
  );
