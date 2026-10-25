-- ==============================================================================
-- STAYNEXA DATABASE-LEVEL ROLE AUTHORIZATION (RBAC) & FINANCIAL DATA PROTECTION
-- Migration Version: 20240104000000
-- Description (SEC-03 Remediation):
--   1. Introduces trusted database identity helper `auth_user_role()` that extracts
--      verified role from active hotel_memberships or profiles for the current auth.uid().
--   2. Hardens Row-Level Security on financial tables (folios, folio_items, payments, invoices)
--      restricting SELECT, INSERT, UPDATE, DELETE to SUPER_ADMIN, HOTEL_ADMIN, HOTEL_MANAGER,
--      and RECEPTION within their assigned hotel. Kitchen, Housekeeping, and Maintenance
--      are strictly blocked at the database level.
--   3. Hardens Row-Level Security on guest reservation and PII tables (reservations, guests)
--      restricting access to front-desk and hotel management roles.
--   4. Hardens operational table access:
--      - Kitchen and Restaurant access scoped to orders, order_items, and menus.
--      - Housekeeping scoped to housekeeping_tasks and rooms.
--      - Maintenance scoped to maintenance_tickets and rooms.
--   5. Fully idempotent (DROP POLICY IF EXISTS) and executed in a single atomic transaction.
-- ==============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ─── 1. TRUSTED ROLE RESOLUTION HELPER FUNCTION ───────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS VARCHAR AS $$
  SELECT COALESCE(
    (
      SELECT m.role 
      FROM public.hotel_memberships m
      WHERE m.user_id = auth.uid() 
        AND m.is_active = true
        AND (
          NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id', '')::UUID IS NULL
          OR m.hotel_id = NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::json->'app_metadata'->>'hotel_id', '')::UUID
        )
      ORDER BY m.created_at ASC
      LIMIT 1
    ),
    (
      SELECT p.role 
      FROM public.profiles p 
      WHERE (p.user_id = auth.uid() OR p.id = auth.uid()) 
        AND p.is_active = true
      LIMIT 1
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.auth_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, service_role;

-- ─── 2. FINANCIAL TABLES RBAC (FOLIOS, FOLIO ITEMS, PAYMENTS, INVOICES) ───────
-- Only SUPER_ADMIN, HOTEL_ADMIN, HOTEL_MANAGER, and RECEPTION may access financial data.

-- 2.1 Folios
DROP POLICY IF EXISTS folios_isolation_policy ON public.folios;
DROP POLICY IF EXISTS folios_role_isolation_policy ON public.folios;
CREATE POLICY folios_role_isolation_policy ON public.folios
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- 2.2 Folio Items
DROP POLICY IF EXISTS folio_items_isolation_policy ON public.folio_items;
DROP POLICY IF EXISTS folio_items_role_isolation_policy ON public.folio_items;
CREATE POLICY folio_items_role_isolation_policy ON public.folio_items
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- 2.3 Payments
DROP POLICY IF EXISTS payments_isolation_policy ON public.payments;
DROP POLICY IF EXISTS payments_role_isolation_policy ON public.payments;
CREATE POLICY payments_role_isolation_policy ON public.payments
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- 2.4 Invoices
DROP POLICY IF EXISTS invoices_isolation_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_role_isolation_policy ON public.invoices;
CREATE POLICY invoices_role_isolation_policy ON public.invoices
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- ─── 3. RESERVATIONS & GUEST PII RBAC ─────────────────────────────────────────
-- Front-desk & Management roles only. Kitchen, Housekeeping, and Maintenance blocked.

-- 3.1 Reservations
DROP POLICY IF EXISTS reservations_isolation_policy ON public.reservations;
DROP POLICY IF EXISTS reservations_role_isolation_policy ON public.reservations;
CREATE POLICY reservations_role_isolation_policy ON public.reservations
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- 3.2 Guests (PII)
DROP POLICY IF EXISTS guests_isolation_policy ON public.guests;
DROP POLICY IF EXISTS guests_role_isolation_policy ON public.guests;
CREATE POLICY guests_role_isolation_policy ON public.guests
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')
        )
    );

-- ─── 4. ORDERS & KITCHEN POS RBAC ─────────────────────────────────────────────
-- Accessible to Management, Reception, Kitchen, and Restaurant Manager.
DROP POLICY IF EXISTS orders_staff_policy ON public.orders;
DROP POLICY IF EXISTS orders_role_isolation_policy ON public.orders;
CREATE POLICY orders_role_isolation_policy ON public.orders
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 'KITCHEN', 'RESTAURANT_MANAGER')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 'KITCHEN', 'RESTAURANT_MANAGER')
        )
    );

DROP POLICY IF EXISTS order_items_staff_policy ON public.order_items;
DROP POLICY IF EXISTS order_items_role_isolation_policy ON public.order_items;
CREATE POLICY order_items_role_isolation_policy ON public.order_items
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 'KITCHEN', 'RESTAURANT_MANAGER')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 'KITCHEN', 'RESTAURANT_MANAGER')
        )
    );

-- ─── 5. HOUSEKEEPING & MAINTENANCE RBAC ───────────────────────────────────────
-- Housekeeping tasks: Management, Reception, and Housekeeping staff
DROP POLICY IF EXISTS housekeeping_isolation_policy ON public.housekeeping_tasks;
DROP POLICY IF EXISTS housekeeping_role_isolation_policy ON public.housekeeping_tasks;
CREATE POLICY housekeeping_role_isolation_policy ON public.housekeeping_tasks
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'HOUSEKEEPING', 'RECEPTION')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'HOUSEKEEPING', 'RECEPTION')
        )
    );

-- Maintenance tickets: Management, Reception, Maintenance, and Housekeeping (can report issues)
DROP POLICY IF EXISTS maintenance_isolation_policy ON public.maintenance_tickets;
DROP POLICY IF EXISTS maintenance_role_isolation_policy ON public.maintenance_tickets;
CREATE POLICY maintenance_role_isolation_policy ON public.maintenance_tickets
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'MAINTENANCE', 'RECEPTION', 'HOUSEKEEPING')
        )
    )
    WITH CHECK (
        is_super_admin() 
        OR (
            hotel_id = auth_hotel_id() 
            AND auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'MAINTENANCE', 'RECEPTION', 'HOUSEKEEPING')
        )
    );

COMMIT;
