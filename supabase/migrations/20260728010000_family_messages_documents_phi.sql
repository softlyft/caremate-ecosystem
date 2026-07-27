-- PHI encryption markers for family members, messages, and provider documents.
-- Ciphertext is written by the Health Data Gateway (service role).

alter table public.family_members
  add column if not exists phi_encrypted_at timestamptz;

comment on column public.family_members.phi_encrypted_at is
  'Set when date_of_birth / gender / notes were encrypted by the health data gateway.';

alter table public.message_messages
  add column if not exists phi_encrypted_at timestamptz,
  add column if not exists phi_key_user_id uuid references auth.users (id) on delete set null;

comment on column public.message_messages.phi_encrypted_at is
  'Set when body / subject were encrypted by the health data gateway.';
comment on column public.message_messages.phi_key_user_id is
  'User whose DEK encrypted this message (patient for org threads; sender for DMs).';

alter table public.message_conversations
  add column if not exists phi_encrypted_at timestamptz,
  add column if not exists preview_phi_key_user_id uuid references auth.users (id) on delete set null;

comment on column public.message_conversations.phi_encrypted_at is
  'Set when last_message_preview was encrypted by the health data gateway.';
comment on column public.message_conversations.preview_phi_key_user_id is
  'User whose DEK encrypted last_message_preview.';

alter table public.provider_documents
  add column if not exists phi_encrypted_at timestamptz;

comment on column public.provider_documents.phi_encrypted_at is
  'Set when title / file_name were encrypted by the health data gateway.';
