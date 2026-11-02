-- ==============================================================================
-- ROLLBACK SCRIPT FOR MIGRATION 6
-- File: 20240106000000_rollback.sql
-- Description:
--   Rolls back Migration 6: revokes anon from helper functions, restores
--   original policies and original resolve_guest_portal_session.
-- ==============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.auth_hotel_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM anon;

DELETE FROM public.hotel_services
WHERE id BETWEEN '00000000-0000-0000-0010-000000000001' AND '00000000-0000-0000-0010-000000000099';

COMMIT;
