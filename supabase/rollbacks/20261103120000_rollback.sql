-- ==============================================================================
-- ROLLBACK: REMOVE STAFF TABLES FROM REALTIME PUBLICATION
-- File: 20261103120000_rollback.sql
-- ==============================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.housekeeping_tasks;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.maintenance_tickets;
