-- Adds staff-facing tables to the realtime publication so Postgres change events reach subscribed devices.
-- Additive only: no data, columns, or policies are changed.

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['housekeeping_tasks', 'notifications', 'maintenance_tickets'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

ALTER TABLE public.housekeeping_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_tickets REPLICA IDENTITY FULL;
