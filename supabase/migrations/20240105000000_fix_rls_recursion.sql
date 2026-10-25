-- ==============================================================================
-- STAYNEXA RLS RECURSION REMEDIATION & PL/PGSQL SECURITY DEFINER HARDENING
-- Migration Version: 20240105000000
-- Description:
--   1. Converts is_super_admin(), auth_hotel_id(), and auth_user_role() from
--      inlinable SQL functions to PL/pgSQL STABLE SECURITY DEFINER functions with
--      an immutable search_path. This prevents PostgreSQL query rewriter from
--      inlining policy queries and triggering 42P17 infinite recursion.
--   2. Splits profiles SELECT policy into self-read (zero dependencies),
--      superadmin-read, and coworker-read to eliminate circular references.
--   3. Replaces memberships_write_policy (which was erroneously created FOR ALL)
--      with targeted INSERT, UPDATE, DELETE policies, breaking the circular
--      cross-table evaluation between profiles and hotel_memberships on SELECT.
--   4. Grants necessary SQL DML privileges (SELECT, INSERT, UPDATE, DELETE) to
--      authenticated role on all tables in public schema so that Row-Level
--      Security policies can govern row access rather than 42501 permission denied.
-- ==============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ─── 1. TRUSTED HELPER FUNCTIONS (PL/pgSQL STABLE SECURITY DEFINER) ───────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND role = 'SUPER_ADMIN'
      AND is_active = true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.auth_hotel_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel_id UUID;
  v_claim_hotel_id TEXT;
BEGIN
  -- If client provided verified hotel claim in JWT app_metadata
  BEGIN
    v_claim_hotel_id := NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id';
  EXCEPTION WHEN OTHERS THEN
    v_claim_hotel_id := NULL;
  END;

  IF v_claim_hotel_id IS NOT NULL AND v_claim_hotel_id ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT hotel_id INTO v_hotel_id
    FROM public.hotel_memberships
    WHERE user_id = auth.uid()
      AND is_active = true
      AND hotel_id = v_claim_hotel_id::UUID
    LIMIT 1;

    IF v_hotel_id IS NOT NULL THEN
      RETURN v_hotel_id;
    END IF;
  END IF;

  -- Default to primary active hotel membership
  SELECT hotel_id INTO v_hotel_id
  FROM public.hotel_memberships
  WHERE user_id = auth.uid()
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_hotel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_hotel_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_hotel_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role VARCHAR;
  v_claim_hotel_id TEXT;
BEGIN
  BEGIN
    v_claim_hotel_id := NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id';
  EXCEPTION WHEN OTHERS THEN
    v_claim_hotel_id := NULL;
  END;

  IF v_claim_hotel_id IS NOT NULL AND v_claim_hotel_id ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT m.role INTO v_role
    FROM public.hotel_memberships m
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.hotel_id = v_claim_hotel_id::UUID
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- Active hotel membership role
  SELECT m.role INTO v_role
  FROM public.hotel_memberships m
  WHERE m.user_id = auth.uid()
    AND m.is_active = true
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Fallback to global profile role (e.g. SUPER_ADMIN)
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
    AND p.is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, service_role;

-- ─── 2. PROFILES ROW-LEVEL SECURITY POLICIES ─────────────────────────────────

DROP POLICY IF EXISTS profiles_read_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
DROP POLICY IF EXISTS profiles_superadmin_read ON public.profiles;
DROP POLICY IF EXISTS profiles_coworker_read ON public.profiles;

-- Self-read: Users can read their own profile directly (zero subquery, zero recursion)
CREATE POLICY profiles_self_read ON public.profiles
    FOR SELECT USING (user_id = auth.uid() OR id = auth.uid());

-- SuperAdmin read: Full profile visibility across platform
CREATE POLICY profiles_superadmin_read ON public.profiles
    FOR SELECT USING (is_super_admin());

-- Coworker read: Staff can read fellow staff within the same active hotel
CREATE POLICY profiles_coworker_read ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.hotel_memberships hm1
            JOIN public.hotel_memberships hm2 ON hm1.hotel_id = hm2.hotel_id
            WHERE hm1.user_id = auth.uid() 
              AND (hm2.user_id = profiles.user_id OR hm2.user_id = profiles.id) 
              AND hm1.is_active = true
        )
    );

-- ─── 3. HOTEL MEMBERSHIPS ROW-LEVEL SECURITY POLICIES ─────────────────────────

DROP POLICY IF EXISTS memberships_write_policy ON public.hotel_memberships;
DROP POLICY IF EXISTS memberships_insert_policy ON public.hotel_memberships;
DROP POLICY IF EXISTS memberships_update_policy ON public.hotel_memberships;
DROP POLICY IF EXISTS memberships_delete_policy ON public.hotel_memberships;

-- Targeted mutation policies replace the former FOR ALL policy to avoid SELECT recursion
CREATE POLICY memberships_insert_policy ON public.hotel_memberships
    FOR INSERT WITH CHECK (
        is_super_admin() 
        OR (hotel_id = auth_hotel_id() AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER'))
    );

CREATE POLICY memberships_update_policy ON public.hotel_memberships
    FOR UPDATE USING (
        is_super_admin() 
        OR (hotel_id = auth_hotel_id() AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER'))
    );

CREATE POLICY memberships_delete_policy ON public.hotel_memberships
    FOR DELETE USING (
        is_super_admin() 
        OR (hotel_id = auth_hotel_id() AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER'))
    );

-- ─── 4. SQL TABLE GRANTS (ENABLING RLS EVALUATION) ───────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Anon guest portal permissions
GRANT SELECT ON public.menu_categories, public.menu_items TO anon;

COMMIT;
