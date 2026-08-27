-- Enable Supabase Realtime for messaging tables so mobile (and future portal)
-- clients can subscribe to postgres_changes instead of polling alone.
-- RLS SELECT policies already restrict which rows each auth.uid() receives.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Filtered UPDATE payloads need full row identity for conversation_id / user filters.
ALTER TABLE public.message_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.message_participants REPLICA IDENTITY FULL;
