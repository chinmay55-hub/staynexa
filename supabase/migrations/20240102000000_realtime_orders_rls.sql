-- ==============================================================================
-- STAYNEXA MIGRATION: CROSS-DEVICE REALTIME & GUEST RLS ORDER PIPELINE
-- ==============================================================================

-- 1. Enable REPLICA IDENTITY FULL so Postgres Realtime broadcasts full row payloads
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE service_requests REPLICA IDENTITY FULL;

-- 2. Ensure Supabase Realtime Publication includes orders and service_requests
DO $$
BEGIN
    -- Check if table orders is already in supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    -- Check if table order_items is already in supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    END IF;

    -- Check if table service_requests is already in supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'service_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Handle environment where publication might be configured via dashboard
        RAISE NOTICE 'Publication adjustment skipped: %', SQLERRM;
END $$;

-- 3. Relaxed RLS for Guest Orders & Order Items (Public Insert & Tenant Read)
-- Drop existing restrictive insert/select policies for orders
DROP POLICY IF EXISTS orders_insert_policy ON orders;
DROP POLICY IF EXISTS orders_guest_insert ON orders;
CREATE POLICY orders_insert_policy ON orders
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS orders_select_policy ON orders;
DROP POLICY IF EXISTS orders_guest_select ON orders;
CREATE POLICY orders_select_policy ON orders
    FOR SELECT 
    USING (
        is_super_admin() 
        OR hotel_id = auth_hotel_id()
        OR status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED')
        OR auth.role() = 'anon'
    );

-- Order Items Policies
DROP POLICY IF EXISTS order_items_insert ON order_items;
CREATE POLICY order_items_insert ON order_items
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS order_items_select ON order_items;
CREATE POLICY order_items_select ON order_items
    FOR SELECT 
    USING (
        is_super_admin()
        OR (hotel_id IS NOT NULL AND hotel_id = auth_hotel_id())
        OR auth.role() = 'anon'
        OR EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id
        )
    );

-- Service Requests Policies
DROP POLICY IF EXISTS requests_insert_policy ON service_requests;
CREATE POLICY requests_insert_policy ON service_requests
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS requests_select_policy ON service_requests;
CREATE POLICY requests_select_policy ON service_requests
    FOR SELECT 
    USING (
        is_super_admin() 
        OR hotel_id = auth_hotel_id()
        OR auth.role() = 'anon'
    );

-- 4. Direct Public RPC Endpoint: create_guest_order
-- Bypasses RLS strictly for guest order placement and returns the enriched order payload
CREATE OR REPLACE FUNCTION create_guest_order(
    p_hotel_id UUID,
    p_room_id UUID DEFAULT NULL,
    p_guest_id UUID DEFAULT NULL,
    p_reservation_id UUID DEFAULT NULL,
    p_type VARCHAR DEFAULT 'ROOM_SERVICE',
    p_subtotal NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0,
    p_total NUMERIC DEFAULT 0,
    p_charge_to_room BOOLEAN DEFAULT true,
    p_special_instructions TEXT DEFAULT NULL,
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
    -- 1. Insert order record
    INSERT INTO orders (
        hotel_id,
        room_id,
        guest_id,
        reservation_id,
        type,
        status,
        subtotal,
        tax_amount,
        total,
        charge_to_room,
        special_instructions,
        created_at,
        updated_at
    ) VALUES (
        p_hotel_id,
        p_room_id,
        p_guest_id,
        p_reservation_id,
        p_type,
        'PENDING',
        p_subtotal,
        p_tax_amount,
        p_total,
        p_charge_to_room,
        p_special_instructions,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_order_id;

    -- 2. Insert line items
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

    -- 3. Return enriched order payload
    SELECT jsonb_build_object(
        'id', o.id,
        'hotel_id', o.hotel_id,
        'room_id', o.room_id,
        'guest_id', o.guest_id,
        'reservation_id', o.reservation_id,
        'type', o.type,
        'status', o.status,
        'subtotal', o.subtotal,
        'tax_amount', o.tax_amount,
        'total', o.total,
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
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM orders o
    WHERE o.id = v_order_id;

    RETURN v_result;
END;
$$;

-- Grant execution to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION create_guest_order TO anon, authenticated, service_role;
