-- Encrypt CareMate AI free-text at rest (same envelope as other HDG PHI).
-- Ciphertext is written by HDG; columns remain text for v1: envelopes.

alter table public.ai_conversation
  add column if not exists phi_encrypted_at timestamptz;

alter table public.ai_message
  add column if not exists phi_encrypted_at timestamptz;

alter table public.ai_feedback
  add column if not exists phi_encrypted_at timestamptz;

comment on column public.ai_conversation.phi_encrypted_at is
  'When title was encrypted under the owner DEK (HDG).';
comment on column public.ai_message.phi_encrypted_at is
  'When content was encrypted under the conversation owner DEK (HDG).';
comment on column public.ai_feedback.phi_encrypted_at is
  'When optional comment was encrypted under the owner DEK (HDG).';
