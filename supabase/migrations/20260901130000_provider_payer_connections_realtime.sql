-- Enable Supabase Realtime for provider↔payer B2B connections so Care Portal
-- connection lists refresh when the peer org approves, rejects, or disconnects.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_payer_connections;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.provider_payer_connections REPLICA IDENTITY FULL;
