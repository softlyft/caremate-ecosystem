-- Allow auth.users delete to null message_messages.sender_user_id.
-- ON DELETE SET NULL was blocked by message_messages_sender_shape requiring
-- sender_user_id IS NOT NULL for sender_party_type = 'user', which made
-- auth.admin.deleteUser (and mobile Settings → Delete account) fail with
-- "Database error deleting user" whenever the patient had sent a message.
--
-- Keep org-send validation; only relax the user branch so attribution can
-- be cleared. Do not require null org columns on user rows — some legacy
-- rows may still carry them.

alter table public.message_messages
  drop constraint if exists message_messages_sender_shape;

alter table public.message_messages
  add constraint message_messages_sender_shape check (
    sender_party_type = 'user'
    or (
      sender_party_type = 'organization'
      and (
        sender_organization_id is not null
        or sender_payer_organization_id is not null
      )
    )
  );

comment on constraint message_messages_sender_shape on public.message_messages is
  'Org sends require a provider or payer org id. User sends allow null sender_user_id after account deletion.';
