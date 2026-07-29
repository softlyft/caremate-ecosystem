-- Shared private bucket for provider catalog workbooks (samples / canonical seed).
-- Service role used by caremate-provider-ingestion bypasses RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-ingest',
  'provider-ingest',
  false,
  52428800, -- 50 MiB (org + location workbooks)
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;
