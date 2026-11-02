-- ==============================================================================
-- ROLLBACK 7: REVERT SELECT PRIVILEGES ON CATALOG TABLES
-- File: 20240107000000_rollback.sql
-- ==============================================================================

BEGIN;

REVOKE SELECT ON public.hotel_services FROM anon;
REVOKE SELECT ON public.menu_categories FROM anon;
REVOKE SELECT ON public.menu_items FROM anon;

COMMIT;
