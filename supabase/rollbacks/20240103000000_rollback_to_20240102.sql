-- ==============================================================================
-- [CRITICAL SECURITY NOTICE — UNSAFE FOR EXECUTION / DO NOT EXECUTE]
-- STAYNEXA LEGACY SCHEMA ROLLBACK SCRIPT: 20240103000000 TO 20240102000000
-- Target Migration: 20240103000000_secure_guest_pipeline.sql
-- Base Migration Target: 20240102000000_realtime_orders_rls.sql
--
-- SECURITY ADVISORY (SEC-02):
-- 1. DO NOT EXECUTE THIS SCRIPT IN STAGING OR PRODUCTION.
-- 2. Downgrading to migration 20240102000000 re-exposes critical vulnerabilities:
--    - Re-grants direct table-level SELECT, INSERT, UPDATE privileges to 'anon' on orders.
--    - Restores permissive 'WITH CHECK (true)' policies on orders and order_items.
--    - Permits client-side price tampering and unauthenticated order reads.
-- 3. APPROVED RECOVERY HIERARCHY:
--    - PRIMARY RECOVERY: Restore from a pre-migration Supabase Point-in-Time Recovery
--      (PITR) snapshot that has been verified through a dedicated restore drill.
--    - SECONDARY RECOVERY: Deploy an emergency reviewed FORWARD-FIX patch maintaining
--      hardened fail-closed RLS and SECURITY DEFINER RPC boundaries.
-- 4. To prevent accidental execution, this file includes a safety halt exception.
-- ==============================================================================

BEGIN;

-- Active safety halt: abort execution immediately
DO $$
BEGIN
    RAISE EXCEPTION 'SAFETY HALT [SEC-02]: Direct execution of 20240103 rollback to 20240102 is BLOCKED. Downgrading restores permissive anonymous table access and public price spoofing. Safe recovery requires restoring from a verified PITR snapshot or applying an approved forward-fix patch.'
        USING ERRCODE = '55000';
END $$;

-- Enforce strict lock timeout to prevent queueing behind active traffic
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ─── 1. DROP COMPOSITE FOREIGN KEYS ───────────────────────────────────────────
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_room_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_res_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_guest_fkey;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_hotel_order_fkey;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_hotel_menu_item_fkey;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_room_fkey;
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_res_fkey;
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_guest_fkey;
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_service_fkey;

-- ─── 2. RESTORE SIMPLE FOREIGN KEYS (FROM 20240102 / INITIAL SCHEMA) ──────────
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_room_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reservation_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_reservation_id_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_guest_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_menu_item_id_fkey
    FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_room_id_fkey;
ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_reservation_id_fkey;
ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_reservation_id_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_guest_id_fkey;
ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_service_id_fkey;
ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.hotel_services(id) ON DELETE SET NULL;

-- ─── 3. DROP PARTIAL UNIQUE INDEXES ───────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_unique_checked_in_room;
DROP INDEX IF EXISTS public.idx_unique_active_room_qr;

-- ─── 4. DROP COMPOSITE UNIQUE CONSTRAINTS ─────────────────────────────────────
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_hotel_id_id_key;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_hotel_id_id_key;
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_hotel_id_id_key;
ALTER TABLE public.hotel_services DROP CONSTRAINT IF EXISTS hotel_services_hotel_id_id_key;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_hotel_id_id_key;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_id_id_key;

-- ─── 5. REVERT COLUMN NOT NULL CONSTRAINTS ────────────────────────────────────
-- Revert order_items.hotel_id to nullable as defined in 20240101
ALTER TABLE public.order_items ALTER COLUMN hotel_id DROP NOT NULL;

-- ─── 6. DROP NEW 20240103 RPC FUNCTIONS ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_guest_order(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_guest_service_request(TEXT, UUID, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS public.get_guest_order_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_guest_request_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_guest_portal_session(TEXT);

-- ─── 7. RESTORE 20240102 CREATE_GUEST_ORDER RPC ──────────────────────────────
CREATE OR REPLACE FUNCTION public.create_guest_order(
    p_hotel_id UUID,
    p_room_id UUID DEFAULT NULL,
    p_room_number VARCHAR DEFAULT NULL,
    p_guest_id UUID DEFAULT NULL,
    p_reservation_id UUID DEFAULT NULL,
    p_type VARCHAR DEFAULT 'ROOM_SERVICE',
    p_subtotal NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0,
    p_total NUMERIC DEFAULT 0,
    p_charge_to_room BOOLEAN DEFAULT true,
    p_special_instructions TEXT DEFAULT NULL,
    p_payment_status VARCHAR DEFAULT 'unpaid',
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_result JSONB;
BEGIN
    INSERT INTO orders (
        hotel_id,
        room_id,
        room_number,
        guest_id,
        reservation_id,
        type,
        status,
        payment_status,
        subtotal,
        tax_amount,
        total,
        total_amount,
        items,
        charge_to_room,
        special_instructions,
        created_at,
        updated_at
    ) VALUES (
        p_hotel_id,
        p_room_id,
        p_room_number,
        p_guest_id,
        p_reservation_id,
        p_type,
        'PENDING',
        p_payment_status,
        p_subtotal,
        p_tax_amount,
        p_total,
        p_total,
        p_items,
        p_charge_to_room,
        p_special_instructions,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_order_id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO order_items (
                order_id,
                hotel_id,
                menu_item_id,
                name,
                quantity,
                unit_price,
                tax_percent,
                total,
                notes
            ) VALUES (
                v_order_id,
                p_hotel_id,
                (v_item->>'menu_item_id')::UUID,
                v_item->>'name',
                COALESCE((v_item->>'quantity')::INTEGER, 1),
                COALESCE((v_item->>'unit_price')::NUMERIC, 0),
                COALESCE((v_item->>'tax_percent')::NUMERIC, 5),
                COALESCE((v_item->>'total')::NUMERIC, 0),
                v_item->>'notes'
            );
        END LOOP;
    END IF;

    SELECT jsonb_build_object(
        'id', o.id,
        'hotel_id', o.hotel_id,
        'room_id', o.room_id,
        'room_number', o.room_number,
        'guest_id', o.guest_id,
        'reservation_id', o.reservation_id,
        'type', o.type,
        'status', o.status,
        'payment_status', o.payment_status,
        'subtotal', o.subtotal,
        'tax_amount', o.tax_amount,
        'total', o.total,
        'total_amount', o.total_amount,
        'charge_to_room', o.charge_to_room,
        'special_instructions', o.special_instructions,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', oi.id,
                'order_id', oi.order_id,
                'menu_item_id', oi.menu_item_id,
                'name', oi.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'tax_percent', oi.tax_percent,
                'total', oi.total,
                'notes', oi.notes
            ))
            FROM order_items oi
            WHERE oi.order_id = o.id
        ), o.items, '[]'::jsonb)
    )
    INTO v_result
    FROM orders o
    WHERE o.id = v_order_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order(UUID, UUID, VARCHAR, UUID, UUID, VARCHAR, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, TEXT, VARCHAR, JSONB) TO anon, authenticated, service_role;

-- ─── 8. REVERT RLS POLICIES & RE-GRANT DIRECT ANON PRIVILEGES ─────────────────
-- Drop 20240103 staff policies
DROP POLICY IF EXISTS orders_staff_policy ON public.orders;
DROP POLICY IF EXISTS order_items_staff_policy ON public.order_items;
DROP POLICY IF EXISTS service_requests_staff_policy ON public.service_requests;
DROP POLICY IF EXISTS qr_codes_staff_policy ON public.qr_codes;

-- Restore anon grants as in 20240102
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO anon;
GRANT SELECT ON public.qr_codes TO anon;

-- Restore 20240102 orders policies
DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
CREATE POLICY orders_insert_policy ON public.orders
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS orders_select_policy ON public.orders;
CREATE POLICY orders_select_policy ON public.orders
    FOR SELECT 
    USING (
        is_super_admin() 
        OR hotel_id = auth_hotel_id()
        OR status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED')
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS orders_update_policy ON public.orders;
CREATE POLICY orders_update_policy ON public.orders
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Restore 20240102 order_items policies
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
CREATE POLICY order_items_insert ON public.order_items
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS order_items_select ON public.order_items;
CREATE POLICY order_items_select ON public.order_items
    FOR SELECT 
    USING (true);

-- Restore 20240102 service_requests policies
DROP POLICY IF EXISTS requests_insert_policy ON public.service_requests;
CREATE POLICY requests_insert_policy ON public.service_requests
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS requests_select_policy ON public.service_requests;
CREATE POLICY requests_select_policy ON public.service_requests
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS requests_update_policy ON public.service_requests;
CREATE POLICY requests_update_policy ON public.service_requests
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Restore initial QR code policies
DROP POLICY IF EXISTS qr_guest_read ON public.qr_codes;
CREATE POLICY qr_guest_read ON public.qr_codes
    FOR SELECT 
    USING (is_active = true);

DROP POLICY IF EXISTS qr_staff_manage ON public.qr_codes;
CREATE POLICY qr_staff_manage ON public.qr_codes
    FOR ALL
    USING (is_super_admin() OR hotel_id = auth_hotel_id());

COMMIT;
