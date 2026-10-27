-- ==============================================================================
-- MIGRATION 7: GRANT SELECT ON CATALOG TABLES TO ANON & AUTHENTICATED
-- File: 20240107000000_grant_catalog_read.sql
-- Description:
--   Grants table-level SELECT on hotel_services, menu_categories, and
--   menu_items to anon and authenticated roles to complement RLS read policies.
-- ==============================================================================

BEGIN;

GRANT SELECT ON public.hotel_services TO anon, authenticated;
GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;

COMMIT;
