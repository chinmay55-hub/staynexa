-- ==============================================================================
-- STAYNEXA HARDENED GUEST PIPELINE & TENANT INTEGRITY MIGRATION
-- Migration Version: 20240103000000
-- Description:
--   1. Preflight safety gates: aborts on duplicate active stays (P0016), orphaned order items (P0017),
--      or cross-tenant foreign key mismatches (P0018) before any destructive changes can occur.
--   2. Partial unique index to enforce at most one CHECKED_IN reservation per room.
--   3. Non-destructive backfill of missing order_items.hotel_id and tracking tokens.
--   4. Composite UNIQUE constraints on (hotel_id, id) for referenced tables.
--   5. Composite Foreign Keys enforcing multi-tenant isolation across all relations.
--   6. Hardened Row-Level Security: drops permissive public policies; restricts direct
--      table access on orders, order_items, service_requests, and qr_codes to authenticated staff.
--   7. Hardened SECURITY DEFINER RPCs (search_path = pg_catalog, public) with
--      server-side price calculation, tenant validation, and secure guest order tracking.
-- ==============================================================================

BEGIN;

-- Enforce strict lock timeout to prevent queueing behind active traffic
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ─── 1. PREFLIGHT INTEGRITY & TENANT SAFETY GATES ─────────────────────────────
DO $$
DECLARE
    v_duplicate_count INTEGER;
    v_null_room_count INTEGER;
    v_orphaned_items_count INTEGER;
    v_order_mismatches INTEGER;
    v_item_mismatches INTEGER;
    v_sr_mismatches INTEGER;
BEGIN
    -- [Gate 1 - P0016] Check for multiple CHECKED_IN reservations on the same room
    SELECT COUNT(*) INTO v_duplicate_count
    FROM (
        SELECT room_id
        FROM public.reservations
        WHERE status = 'CHECKED_IN' AND room_id IS NOT NULL
        GROUP BY room_id
        HAVING COUNT(*) > 1
    ) dup;

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0016]: Found % room(s) with multiple active CHECKED_IN reservations. Resolve duplicate active stays before applying this migration.', v_duplicate_count
            USING ERRCODE = 'P0016';
    END IF;

    -- [Gate 1 - P0016] Check for CHECKED_IN reservations without a room assignment
    SELECT COUNT(*) INTO v_null_room_count
    FROM public.reservations
    WHERE status = 'CHECKED_IN' AND room_id IS NULL;

    IF v_null_room_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0016]: Found % active CHECKED_IN reservation(s) with NULL room_id. Assign rooms or adjust reservation status before applying this migration.', v_null_room_count
            USING ERRCODE = 'P0016';
    END IF;

    -- [Gate 2 - P0017] Check for orphaned order_items referencing non-existent orders
    SELECT COUNT(*) INTO v_orphaned_items_count
    FROM public.order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id);

    IF v_orphaned_items_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0017]: Found % orphaned order_item(s) referencing non-existent orders. Resolve or archive orphaned items before applying this migration.', v_orphaned_items_count
            USING ERRCODE = 'P0017';
    END IF;

    -- [Gate 3 - P0018] Check orders for cross-tenant or mismatched room/reservation/guest references
    SELECT COUNT(*) INTO v_order_mismatches
    FROM public.orders o
    WHERE (o.room_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.hotel_id = o.hotel_id AND r.id = o.room_id))
       OR (o.reservation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.reservations res WHERE res.hotel_id = o.hotel_id AND res.id = o.reservation_id))
       OR (o.guest_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.guests g WHERE g.hotel_id = o.hotel_id AND g.id = o.guest_id));

    IF v_order_mismatches > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0018]: Found % order(s) with cross-tenant or invalid room/reservation/guest references. Reconcile records before applying this migration.', v_order_mismatches
            USING ERRCODE = 'P0018';
    END IF;

    -- [Gate 3 - P0018] Check order_items for conflicting hotel_id or cross-tenant menu items
    SELECT COUNT(*) INTO v_item_mismatches
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE (oi.hotel_id IS NOT NULL AND oi.hotel_id <> o.hotel_id)
       OR (oi.menu_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.hotel_id = o.hotel_id AND m.id = oi.menu_item_id));

    IF v_item_mismatches > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0018]: Found % order item(s) with cross-tenant or conflicting hotel/menu item references. Reconcile records before applying this migration.', v_item_mismatches
            USING ERRCODE = 'P0018';
    END IF;

    -- [Gate 3 - P0018] Check service_requests for cross-tenant or mismatched room/reservation/guest/service references
    SELECT COUNT(*) INTO v_sr_mismatches
    FROM public.service_requests sr
    WHERE (sr.room_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.hotel_id = sr.hotel_id AND r.id = sr.room_id))
       OR (sr.reservation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.reservations res WHERE res.hotel_id = sr.hotel_id AND res.id = sr.reservation_id))
       OR (sr.guest_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.guests g WHERE g.hotel_id = sr.hotel_id AND g.id = sr.guest_id))
       OR (sr.service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.hotel_services hs WHERE hs.hotel_id = sr.hotel_id AND hs.id = sr.service_id));

    IF v_sr_mismatches > 0 THEN
        RAISE EXCEPTION 'MIGRATION ABORTED [P0018]: Found % service request(s) with cross-tenant or invalid room/reservation/guest/service references. Reconcile records before applying this migration.', v_sr_mismatches
            USING ERRCODE = 'P0018';
    END IF;
END $$;

-- ─── 2. PARTIAL UNIQUE INDEX ON ACTIVE CHECKED-IN STAYS ───────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_checked_in_room
    ON public.reservations(room_id)
    WHERE status = 'CHECKED_IN';

-- ─── 3. BACKFILL & DATA INTEGRITY ─────────────────────────────────────────────
-- Add tracking_token columns for cryptographically secure guest tracking
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token 
    ON public.orders(tracking_token);

ALTER TABLE public.service_requests 
    ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_service_requests_tracking_token 
    ON public.service_requests(tracking_token);

-- Backfill order_items.hotel_id from parent orders strictly where missing (hotel_id IS NULL).
-- Note: Any conflicting non-null hotel_id is rejected upstream by Gate P0018.
UPDATE public.order_items oi
SET hotel_id = o.hotel_id
FROM public.orders o
WHERE oi.order_id = o.id AND oi.hotel_id IS NULL;

-- Enforce NOT NULL on order_items.hotel_id
ALTER TABLE public.order_items 
    ALTER COLUMN hotel_id SET NOT NULL;

-- ─── 4. COMPOSITE UNIQUE CONSTRAINTS FOR TENANT INTEGRITY ─────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_hotel_id_id_key') THEN
        ALTER TABLE public.rooms ADD CONSTRAINT rooms_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_hotel_id_id_key') THEN
        ALTER TABLE public.reservations ADD CONSTRAINT reservations_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guests_hotel_id_id_key') THEN
        ALTER TABLE public.guests ADD CONSTRAINT guests_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_services_hotel_id_id_key') THEN
        ALTER TABLE public.hotel_services ADD CONSTRAINT hotel_services_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_hotel_id_id_key') THEN
        ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_hotel_id_id_key') THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_hotel_id_id_key UNIQUE (hotel_id, id);
    END IF;

    -- Drop unconditional unique constraint on qr_codes if previously created
    ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_hotel_room_key;

    -- Safely deactivate older duplicate active QR codes per (hotel_id, room_id) to ensure existing data upgrades cleanly
    UPDATE public.qr_codes q1
    SET is_active = false
    WHERE q1.is_active = true
      AND q1.room_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.qr_codes q2
        WHERE q2.hotel_id = q1.hotel_id
          AND q2.room_id = q1.room_id
          AND q2.is_active = true
          AND (q2.created_at > q1.created_at OR (q2.created_at = q1.created_at AND q2.id > q1.id))
      );
END $$;

-- Partial unique index to enforce at most one ACTIVE QR code per room (allows inactive historical records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room_qr
    ON public.qr_codes(hotel_id, room_id)
    WHERE is_active = true AND room_id IS NOT NULL;

-- ─── 5. COMPOSITE FOREIGN KEYS (MULTI-TENANT ISOLATION) ───────────────────────
DO $$
BEGIN
    -- orders composite foreign keys
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_room_id_fkey;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_room_fkey;
    ALTER TABLE public.orders ADD CONSTRAINT orders_hotel_room_fkey
        FOREIGN KEY (hotel_id, room_id) REFERENCES public.rooms(hotel_id, id) ON DELETE RESTRICT;

    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reservation_id_fkey;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_res_fkey;
    ALTER TABLE public.orders ADD CONSTRAINT orders_hotel_res_fkey
        FOREIGN KEY (hotel_id, reservation_id) REFERENCES public.reservations(hotel_id, id) ON DELETE RESTRICT;

    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_guest_id_fkey;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_hotel_guest_fkey;
    ALTER TABLE public.orders ADD CONSTRAINT orders_hotel_guest_fkey
        FOREIGN KEY (hotel_id, guest_id) REFERENCES public.guests(hotel_id, id) ON DELETE RESTRICT;

    -- order_items composite foreign keys
    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_hotel_order_fkey;
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_hotel_order_fkey
        FOREIGN KEY (hotel_id, order_id) REFERENCES public.orders(hotel_id, id) ON DELETE CASCADE;

    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;
    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_hotel_menu_item_fkey;
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_hotel_menu_item_fkey
        FOREIGN KEY (hotel_id, menu_item_id) REFERENCES public.menu_items(hotel_id, id) ON DELETE RESTRICT;

    -- service_requests composite foreign keys
    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_room_id_fkey;
    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_room_fkey;
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_hotel_room_fkey
        FOREIGN KEY (hotel_id, room_id) REFERENCES public.rooms(hotel_id, id) ON DELETE RESTRICT;

    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_reservation_id_fkey;
    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_res_fkey;
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_hotel_res_fkey
        FOREIGN KEY (hotel_id, reservation_id) REFERENCES public.reservations(hotel_id, id) ON DELETE RESTRICT;

    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_guest_id_fkey;
    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_guest_fkey;
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_hotel_guest_fkey
        FOREIGN KEY (hotel_id, guest_id) REFERENCES public.guests(hotel_id, id) ON DELETE RESTRICT;

    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_service_id_fkey;
    ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_hotel_service_fkey;
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_hotel_service_fkey
        FOREIGN KEY (hotel_id, service_id) REFERENCES public.hotel_services(hotel_id, id) ON DELETE RESTRICT;
END $$;

-- ─── 6. RLS POLICY HARDENING & PERMISSION REVOCATION ──────────────────────────
-- Drop old permissive and redundant policies from migration 20240102000000 and initial schema
DROP POLICY IF EXISTS orders_insert_policy ON public.orders;
DROP POLICY IF EXISTS orders_select_policy ON public.orders;
DROP POLICY IF EXISTS orders_update_policy ON public.orders;
DROP POLICY IF EXISTS orders_guest_insert ON public.orders;
DROP POLICY IF EXISTS orders_guest_select ON public.orders;

DROP POLICY IF EXISTS order_items_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_select ON public.order_items;
DROP POLICY IF EXISTS order_items_modify ON public.order_items;

DROP POLICY IF EXISTS requests_insert_policy ON public.service_requests;
DROP POLICY IF EXISTS requests_select_policy ON public.service_requests;
DROP POLICY IF EXISTS requests_update_policy ON public.service_requests;
DROP POLICY IF EXISTS requests_isolation_policy ON public.service_requests;

-- Drop legacy QR code policies that allow cross-tenant reading
DROP POLICY IF EXISTS qr_guest_read ON public.qr_codes;
DROP POLICY IF EXISTS qr_staff_manage ON public.qr_codes;

-- Revoke direct anon DML on sensitive guest pipeline tables
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.order_items FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.service_requests FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.qr_codes FROM anon;

-- Re-enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Strict tenant-isolated policies for authenticated staff
DROP POLICY IF EXISTS orders_staff_policy ON public.orders;
CREATE POLICY orders_staff_policy ON public.orders
    FOR ALL
    TO authenticated
    USING (is_super_admin() OR hotel_id = auth_hotel_id())
    WITH CHECK (is_super_admin() OR hotel_id = auth_hotel_id());

DROP POLICY IF EXISTS order_items_staff_policy ON public.order_items;
CREATE POLICY order_items_staff_policy ON public.order_items
    FOR ALL
    TO authenticated
    USING (is_super_admin() OR hotel_id = auth_hotel_id())
    WITH CHECK (is_super_admin() OR hotel_id = auth_hotel_id());

DROP POLICY IF EXISTS service_requests_staff_policy ON public.service_requests;
CREATE POLICY service_requests_staff_policy ON public.service_requests
    FOR ALL
    TO authenticated
    USING (is_super_admin() OR hotel_id = auth_hotel_id())
    WITH CHECK (is_super_admin() OR hotel_id = auth_hotel_id());

DROP POLICY IF EXISTS qr_codes_staff_policy ON public.qr_codes;
CREATE POLICY qr_codes_staff_policy ON public.qr_codes
    FOR ALL
    TO authenticated
    USING (is_super_admin() OR hotel_id = auth_hotel_id())
    WITH CHECK (is_super_admin() OR hotel_id = auth_hotel_id());

-- ─── 7. DROP INSECURE RPC OVERLOADS ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_guest_order(UUID, UUID, VARCHAR, UUID, UUID, VARCHAR, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, TEXT, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.create_guest_order(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_guest_service_request(TEXT, UUID, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS public.get_guest_order_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_guest_request_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_guest_portal_session(TEXT);

-- ─── 8. HARDENED SECURITY DEFINER RPCS ────────────────────────────────────────

-- RPC 1: create_guest_order
-- Validates QR token, enforces active checked-in stay, computes prices server-side,
-- inserts parent orders before order_items, and returns order with tracking token.
CREATE OR REPLACE FUNCTION public.create_guest_order(
    p_token TEXT,
    p_type VARCHAR DEFAULT 'ROOM_SERVICE',
    p_charge_to_room BOOLEAN DEFAULT true,
    p_special_instructions TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_hotel_id UUID;
    v_room_id UUID;
    v_room_number VARCHAR(50);
    v_reservation_id UUID;
    v_guest_id UUID;
    v_order_id UUID := gen_random_uuid();
    v_tracking_token UUID := gen_random_uuid();
    v_payment_status VARCHAR(50);
    v_item JSONB;
    v_menu_item_id UUID;
    v_item_name VARCHAR(255);
    v_unit_price NUMERIC(12,2);
    v_tax_percent NUMERIC(5,2);
    v_quantity INTEGER;
    v_notes TEXT;
    v_line_subtotal NUMERIC(12,2);
    v_line_tax NUMERIC(12,2);
    v_line_total NUMERIC(12,2);
    v_calculated_subtotal NUMERIC(12,2) := 0.00;
    v_calculated_tax NUMERIC(12,2) := 0.00;
    v_calculated_total NUMERIC(12,2) := 0.00;
    v_is_available BOOLEAN;
    v_validated_items JSONB := '[]'::jsonb;
    v_result JSONB;
BEGIN
    -- 1. Validate active QR token and resolve hotel and room
    SELECT qr.hotel_id, qr.room_id
    INTO v_hotel_id, v_room_id
    FROM public.qr_codes qr
    WHERE qr.token = p_token AND qr.is_active = true;

    IF NOT FOUND OR v_hotel_id IS NULL OR v_room_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_QR_TOKEN: QR token is invalid, expired, or unassigned.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Validate active checked-in reservation for this room
    SELECT res.id, res.guest_id
    INTO v_reservation_id, v_guest_id
    FROM public.reservations res
    WHERE res.room_id = v_room_id
      AND res.hotel_id = v_hotel_id
      AND res.status = 'CHECKED_IN'
    ORDER BY res.created_at DESC
    LIMIT 1;

    IF NOT FOUND OR v_reservation_id IS NULL THEN
        RAISE EXCEPTION 'NO_ACTIVE_CHECKIN: No active checked-in guest found for this room.'
            USING ERRCODE = 'P0002';
    END IF;

    -- Resolve room number
    SELECT r.number INTO v_room_number
    FROM public.rooms r
    WHERE r.id = v_room_id AND r.hotel_id = v_hotel_id;

    -- 3. Validate items and compute prices server-side
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ORDER: Order must contain at least one item.'
            USING ERRCODE = 'P0003';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_menu_item_id := (v_item->>'menu_item_id')::UUID;
        v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
        v_notes := v_item->>'notes';

        IF v_quantity <= 0 OR v_quantity > 100 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be between 1 and 100.'
                USING ERRCODE = 'P0004';
        END IF;

        -- Verify menu item exists and strictly belongs to this hotel
        SELECT mi.name, mi.price, COALESCE(mi.tax_percent, 5.00), mi.is_available
        INTO v_item_name, v_unit_price, v_tax_percent, v_is_available
        FROM public.menu_items mi
        WHERE mi.id = v_menu_item_id AND mi.hotel_id = v_hotel_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_MENU_ITEM: Item % does not exist for this hotel.', v_menu_item_id
                USING ERRCODE = 'P0005';
        END IF;

        IF NOT v_is_available THEN
            RAISE EXCEPTION 'ITEM_UNAVAILABLE: % is currently unavailable.', v_item_name
                USING ERRCODE = 'P0006';
        END IF;

        v_line_subtotal := ROUND(v_unit_price * v_quantity, 2);
        v_line_tax := ROUND(v_line_subtotal * (v_tax_percent / 100.0), 2);
        v_line_total := v_line_subtotal + v_line_tax;

        v_calculated_subtotal := v_calculated_subtotal + v_line_subtotal;
        v_calculated_tax := v_calculated_tax + v_line_tax;
        v_calculated_total := v_calculated_total + v_line_total;

        v_validated_items := v_validated_items || jsonb_build_object(
            'menu_item_id', v_menu_item_id,
            'name', v_item_name,
            'quantity', v_quantity,
            'unit_price', v_unit_price,
            'tax_percent', v_tax_percent,
            'total', v_line_total,
            'notes', v_notes
        );
    END LOOP;

    -- 4. Determine payment status (direct pay is pending_payment until settled)
    v_payment_status := CASE WHEN p_charge_to_room THEN 'unpaid' ELSE 'pending_payment' END;

    -- 5. Insert PARENT order row first
    INSERT INTO public.orders (
        id,
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
        charge_to_room,
        special_instructions,
        tracking_token,
        items,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_hotel_id,
        v_room_id,
        v_room_number,
        v_guest_id,
        v_reservation_id,
        COALESCE(p_type, 'ROOM_SERVICE'),
        'PENDING',
        v_payment_status,
        v_calculated_subtotal,
        v_calculated_tax,
        v_calculated_total,
        v_calculated_total,
        p_charge_to_room,
        p_special_instructions,
        v_tracking_token,
        v_validated_items,
        NOW(),
        NOW()
    );

    -- 6. Insert CHILD order_items rows
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_validated_items)
    LOOP
        INSERT INTO public.order_items (
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
            v_hotel_id,
            (v_item->>'menu_item_id')::UUID,
            v_item->>'name',
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'tax_percent')::NUMERIC,
            (v_item->>'total')::NUMERIC,
            v_item->>'notes'
        );
    END LOOP;

    -- 7. Build and return enriched order payload
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
        'tracking_token', o.tracking_token,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', v_validated_items
    )
    INTO v_result
    FROM public.orders o
    WHERE o.id = v_order_id;

    RETURN v_result;
END;
$$;

-- RPC 2: create_guest_service_request
CREATE OR REPLACE FUNCTION public.create_guest_service_request(
    p_token TEXT,
    p_service_id UUID DEFAULT NULL,
    p_title VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'MEDIUM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_hotel_id UUID;
    v_room_id UUID;
    v_reservation_id UUID;
    v_guest_id UUID;
    v_service_name VARCHAR(100);
    v_request_id UUID := gen_random_uuid();
    v_tracking_token UUID := gen_random_uuid();
    v_title VARCHAR(255);
    v_is_available BOOLEAN;
BEGIN
    -- 1. Validate QR token
    SELECT qr.hotel_id, qr.room_id
    INTO v_hotel_id, v_room_id
    FROM public.qr_codes qr
    WHERE qr.token = p_token AND qr.is_active = true;

    IF NOT FOUND OR v_hotel_id IS NULL OR v_room_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_QR_TOKEN: QR token is invalid or expired.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Validate active checked-in stay
    SELECT res.id, res.guest_id
    INTO v_reservation_id, v_guest_id
    FROM public.reservations res
    WHERE res.room_id = v_room_id
      AND res.hotel_id = v_hotel_id
      AND res.status = 'CHECKED_IN'
    ORDER BY res.created_at DESC
    LIMIT 1;

    IF NOT FOUND OR v_reservation_id IS NULL THEN
        RAISE EXCEPTION 'NO_ACTIVE_CHECKIN: No checked-in stay found for this room.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 3. If service_id provided, validate catalog item
    IF p_service_id IS NOT NULL THEN
        SELECT hs.name, hs.is_available
        INTO v_service_name, v_is_available
        FROM public.hotel_services hs
        WHERE hs.id = p_service_id AND hs.hotel_id = v_hotel_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'INVALID_SERVICE: Service does not belong to this hotel.'
                USING ERRCODE = 'P0005';
        END IF;

        IF NOT v_is_available THEN
            RAISE EXCEPTION 'SERVICE_UNAVAILABLE: This service is currently unavailable.'
                USING ERRCODE = 'P0006';
        END IF;
    END IF;

    v_title := COALESCE(NULLIF(TRIM(p_title), ''), v_service_name, 'Guest Service Request');

    -- 4. Insert service request
    INSERT INTO public.service_requests (
        id,
        hotel_id,
        reservation_id,
        room_id,
        guest_id,
        service_id,
        status,
        priority,
        title,
        description,
        tracking_token,
        created_at,
        updated_at
    ) VALUES (
        v_request_id,
        v_hotel_id,
        v_reservation_id,
        v_room_id,
        v_guest_id,
        p_service_id,
        'PENDING',
        COALESCE(p_priority, 'MEDIUM'),
        v_title,
        p_description,
        v_tracking_token,
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'id', v_request_id,
        'tracking_token', v_tracking_token,
        'status', 'PENDING',
        'title', v_title,
        'priority', COALESCE(p_priority, 'MEDIUM'),
        'created_at', NOW()
    );
END;
$$;

-- RPC 3: get_guest_order_status
-- Returns order status if tracking token matches and order is within retention window
CREATE OR REPLACE FUNCTION public.get_guest_order_status(
    p_order_id UUID,
    p_tracking_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'hotel_id', o.hotel_id,
        'room_number', o.room_number,
        'status', o.status,
        'payment_status', o.payment_status,
        'subtotal', o.subtotal,
        'tax_amount', o.tax_amount,
        'total', o.total,
        'accepted_at', o.accepted_at,
        'preparing_at', o.preparing_at,
        'ready_at', o.ready_at,
        'delivered_at', o.delivered_at,
        'created_at', o.created_at,
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', oi.id,
                'name', oi.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total', oi.total,
                'notes', oi.notes
            ))
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        ), o.items, '[]'::jsonb)
    )
    INTO v_result
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.tracking_token = p_tracking_token
      AND (
          -- Active orders readable up to 72 hours; terminal orders up to 24 hours
          (UPPER(o.status) IN ('DELIVERED', 'CANCELLED', 'COMPLETED') AND o.created_at > NOW() - INTERVAL '24 hours')
          OR
          (UPPER(o.status) NOT IN ('DELIVERED', 'CANCELLED', 'COMPLETED') AND o.created_at > NOW() - INTERVAL '72 hours')
      );

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_EXPIRED: Order not found or tracking token expired.'
            USING ERRCODE = 'P0007';
    END IF;

    RETURN v_result;
END;
$$;

-- RPC 4: get_guest_request_status
CREATE OR REPLACE FUNCTION public.get_guest_request_status(
    p_request_id UUID,
    p_tracking_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', sr.id,
        'hotel_id', sr.hotel_id,
        'title', sr.title,
        'description', sr.description,
        'priority', sr.priority,
        'status', sr.status,
        'completed_at', sr.completed_at,
        'created_at', sr.created_at
    )
    INTO v_result
    FROM public.service_requests sr
    WHERE sr.id = p_request_id
      AND sr.tracking_token = p_tracking_token
      AND (
          (UPPER(sr.status) IN ('COMPLETED', 'CANCELLED') AND sr.created_at > NOW() - INTERVAL '24 hours')
          OR
          (UPPER(sr.status) NOT IN ('COMPLETED', 'CANCELLED') AND sr.created_at > NOW() - INTERVAL '72 hours')
      );

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND_OR_EXPIRED: Request not found or tracking token expired.'
            USING ERRCODE = 'P0008';
    END IF;

    RETURN v_result;
END;
$$;

-- RPC 5: resolve_guest_portal_session
-- Resolves QR token to hotel, room, and active stay details without leaking other data
CREATE OR REPLACE FUNCTION public.resolve_guest_portal_session(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_qr RECORD;
    v_hotel RECORD;
    v_room RECORD;
    v_res_id UUID := NULL;
    v_res_booking_id VARCHAR(100) := NULL;
    v_res_check_in_date DATE := NULL;
    v_res_check_out_date DATE := NULL;
    v_res_status VARCHAR(50) := NULL;
    v_res_guest_id UUID := NULL;
    v_res_total_amount NUMERIC(12,2) := NULL;
    v_guest_id UUID := NULL;
    v_guest_first_name VARCHAR(100) := NULL;
    v_guest_last_name VARCHAR(100) := NULL;
BEGIN
    -- 1. Find active QR code
    SELECT * INTO v_qr
    FROM public.qr_codes
    WHERE token = p_token AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_QR_TOKEN: QR token is not recognized or has been deactivated.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Fetch hotel details (safe attributes only)
    SELECT id, name, slug, address, city, state, country, currency, timezone, phone, email
    INTO v_hotel
    FROM public.hotels
    WHERE id = v_qr.hotel_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HOTEL_INACTIVE: Hotel is currently inactive.'
            USING ERRCODE = 'P0009';
    END IF;

    -- 3. Fetch room details
    SELECT id, number, floor, status, housekeeping_status
    INTO v_room
    FROM public.rooms
    WHERE id = v_qr.room_id AND hotel_id = v_qr.hotel_id;

    -- 4. Fetch active checked-in stay (if any)
    SELECT id, external_booking_id, check_in_date, check_out_date, status, guest_id, total_amount
    INTO v_res_id, v_res_booking_id, v_res_check_in_date, v_res_check_out_date, v_res_status, v_res_guest_id, v_res_total_amount
    FROM public.reservations
    WHERE room_id = v_qr.room_id
      AND hotel_id = v_qr.hotel_id
      AND status = 'CHECKED_IN'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Fetch guest details only if an active stay exists with a valid guest identifier
    IF v_res_id IS NOT NULL AND v_res_guest_id IS NOT NULL THEN
        SELECT id, first_name, last_name
        INTO v_guest_id, v_guest_first_name, v_guest_last_name
        FROM public.guests
        WHERE id = v_res_guest_id AND hotel_id = v_qr.hotel_id;
    END IF;

    RETURN jsonb_build_object(
        'hotel', to_jsonb(v_hotel),
        'room', to_jsonb(v_room),
        'has_active_stay', (v_res_id IS NOT NULL),
        'reservation', CASE WHEN v_res_id IS NOT NULL THEN jsonb_build_object(
            'id', v_res_id,
            'confirmation_code', COALESCE(v_res_booking_id, v_res_id::text),
            'booking_id', v_res_booking_id,
            'check_in_date', v_res_check_in_date,
            'check_out_date', v_res_check_out_date,
            'status', v_res_status,
            'total_amount', v_res_total_amount
        ) ELSE NULL END,
        'guest', CASE WHEN v_guest_id IS NOT NULL THEN jsonb_build_object(
            'id', v_guest_id,
            'first_name', v_guest_first_name,
            'last_name', v_guest_last_name
        ) ELSE NULL END
    );
END;
$$;

-- ─── 9. SECURE RPC PERMISSIONS ────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.create_guest_order(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(TEXT, VARCHAR, BOOLEAN, TEXT, JSONB) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_guest_service_request(TEXT, UUID, VARCHAR, TEXT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_service_request(TEXT, UUID, VARCHAR, TEXT, VARCHAR) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_guest_order_status(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order_status(UUID, UUID) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_guest_request_status(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_request_status(UUID, UUID) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_guest_portal_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_guest_portal_session(TEXT) TO anon, authenticated, service_role;

COMMIT;
