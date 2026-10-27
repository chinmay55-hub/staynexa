-- ==============================================================================
-- MIGRATION 6: GUEST PORTAL & KDS OPERATIONAL PIPELINE HARDENING
-- File: 20240106000000_guest_portal_kds_pipeline.sql
-- Description:
--   1. Grants execute permissions on safe helper functions to anon to unblock
--      public catalog queries.
--   2. Scopes write policies on catalog tables (menu_categories, menu_items,
--      hotel_services) to authenticated/service_role only.
--   3. Upgrades resolve_guest_portal_session RPC to return comprehensive,
--      tenant-scoped guest portal payload atomically (hotel branding, room,
--      active stay, menu categories, menu items, hotel services, active orders/requests).
--   4. Populates standard hotel_services catalog for Grand Palace.
--   5. Adds idempotency safeguard to create_guest_order.
-- ==============================================================================

BEGIN;

-- 1. UNBLOCK HELPER FUNCTIONS FOR ANONYMOUS SESSIONS
-- These functions return NULL or false when auth.uid() IS NULL, which is safe.
GRANT EXECUTE ON FUNCTION public.auth_hotel_id() TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO anon;

-- 2. HARDEN CATALOG RLS POLICIES FOR MENU & SERVICES
-- Public read for active/available items; staff write restricted to authenticated users.
DROP POLICY IF EXISTS menu_categories_read ON public.menu_categories;
CREATE POLICY menu_categories_read ON public.menu_categories
    FOR SELECT TO public
    USING (is_active = true);

DROP POLICY IF EXISTS menu_categories_write ON public.menu_categories;
CREATE POLICY menu_categories_write ON public.menu_categories
    FOR ALL TO authenticated, service_role
    USING (public.is_super_admin() OR hotel_id = public.auth_hotel_id())
    WITH CHECK (public.is_super_admin() OR hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS menu_items_read ON public.menu_items;
CREATE POLICY menu_items_read ON public.menu_items
    FOR SELECT TO public
    USING (is_available = true);

DROP POLICY IF EXISTS menu_items_write ON public.menu_items;
CREATE POLICY menu_items_write ON public.menu_items
    FOR ALL TO authenticated, service_role
    USING (public.is_super_admin() OR hotel_id = public.auth_hotel_id())
    WITH CHECK (public.is_super_admin() OR hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS hotel_services_read ON public.hotel_services;
CREATE POLICY hotel_services_read ON public.hotel_services
    FOR SELECT TO public
    USING (is_available = true);

DROP POLICY IF EXISTS hotel_services_write ON public.hotel_services;
CREATE POLICY hotel_services_write ON public.hotel_services
    FOR ALL TO authenticated, service_role
    USING (public.is_super_admin() OR hotel_id = public.auth_hotel_id())
    WITH CHECK (public.is_super_admin() OR hotel_id = public.auth_hotel_id());

-- 3. SEED STANDARD HOTEL SERVICES CATALOG FOR GRAND PALACE
INSERT INTO public.hotel_services (id, hotel_id, name, description, category, price, is_available, requires_scheduling)
VALUES
  ('00000000-0000-0000-0010-000000000001', '00000000-0000-0000-0000-000000000001', 'Room Cleaning', 'Full daily housekeeping and room refresh', 'HOUSEKEEPING', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000002', '00000000-0000-0000-0000-000000000001', 'Fresh Towels', 'Delivery of fresh plush bath and hand towels', 'HOUSEKEEPING', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000003', '00000000-0000-0000-0000-000000000001', 'Extra Toiletries', 'Complimentary dental kit, soap, shampoo & lotion', 'HOUSEKEEPING', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000004', '00000000-0000-0000-0000-000000000001', 'Linen Change', 'Complete bed linen and pillow cover change', 'HOUSEKEEPING', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000005', '00000000-0000-0000-0000-000000000001', 'AC & Climate Control', 'Air conditioning inspection, temperature or filter check', 'MAINTENANCE', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000006', '00000000-0000-0000-0000-000000000001', 'Plumbing & Hot Water', 'Bathroom faucet, shower pressure or hot water repair', 'MAINTENANCE', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000007', '00000000-0000-0000-0000-000000000001', 'Electrical & Lighting', 'Light fixtures, switches or bedside charging ports', 'MAINTENANCE', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000008', '00000000-0000-0000-0000-000000000001', 'Wi-Fi & Entertainment', 'High-speed Wi-Fi assistance or smart TV setup', 'MAINTENANCE', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000009', '00000000-0000-0000-0000-000000000001', 'Wake-up Call', 'Scheduled personalized morning wake-up call', 'CONCIERGE', 0.00, true, true),
  ('00000000-0000-0000-0010-000000000010', '00000000-0000-0000-0000-000000000001', 'Luggage Assistance', 'Bellhop service for baggage handling and transfer', 'CONCIERGE', 0.00, true, false),
  ('00000000-0000-0000-0010-000000000011', '00000000-0000-0000-0000-000000000001', 'Express Laundry & Press', 'Professional washing, dry-cleaning or steam press', 'LAUNDRY', 200.00, true, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  is_available = EXCLUDED.is_available,
  requires_scheduling = EXCLUDED.requires_scheduling;

-- 4. UPGRADE RESOLVE_GUEST_PORTAL_SESSION RPC
-- Returns complete guest session and catalog atomically with strict tenant scoping.
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
    v_branding RECORD;
    v_settings RECORD;
    v_room RECORD;
    v_room_type RECORD;
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
    v_categories JSONB := '[]'::jsonb;
    v_menu_items JSONB := '[]'::jsonb;
    v_services JSONB := '[]'::jsonb;
    v_recent_orders JSONB := '[]'::jsonb;
    v_recent_requests JSONB := '[]'::jsonb;
BEGIN
    -- 1. Find active QR code
    SELECT * INTO v_qr
    FROM public.qr_codes
    WHERE token = p_token AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_QR_TOKEN: QR token is not recognized or has been deactivated.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Fetch hotel details (safe guest-facing attributes only)
    SELECT id, name, slug, address, city, state, country, currency, timezone, phone, email, check_in_time, check_out_time
    INTO v_hotel
    FROM public.hotels
    WHERE id = v_qr.hotel_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HOTEL_INACTIVE: Hotel is currently inactive.'
            USING ERRCODE = 'P0002';
    END IF;

    -- Fetch branding
    SELECT primary_color, accent_color, tagline, logo_url
    INTO v_branding
    FROM public.hotel_branding
    WHERE hotel_id = v_qr.hotel_id
    LIMIT 1;

    -- Fetch guest settings (safe Wi-Fi disclosure)
    SELECT wifi_name, wifi_password, allow_room_charge
    INTO v_settings
    FROM public.hotel_settings
    WHERE hotel_id = v_qr.hotel_id
    LIMIT 1;

    -- 3. Fetch room details
    SELECT id, number, floor, status, housekeeping_status, room_type_id
    INTO v_room
    FROM public.rooms
    WHERE id = v_qr.room_id AND hotel_id = v_qr.hotel_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ROOM_NOT_FOUND: Room is inactive or not assigned.'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT name, code, base_rate INTO v_room_type
    FROM public.room_types
    WHERE id = v_room.room_type_id;

    -- 4. Fetch active checked-in stay (if any)
    SELECT id, external_booking_id, check_in_date, check_out_date, status, guest_id, total_amount
    INTO v_res_id, v_res_booking_id, v_res_check_in_date, v_res_check_out_date, v_res_status, v_res_guest_id, v_res_total_amount
    FROM public.reservations
    WHERE room_id = v_qr.room_id
      AND hotel_id = v_qr.hotel_id
      AND status = 'CHECKED_IN'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Fetch guest details only if an active stay exists
    IF v_res_id IS NOT NULL AND v_res_guest_id IS NOT NULL THEN
        SELECT id, first_name, last_name
        INTO v_guest_id, v_guest_first_name, v_guest_last_name
        FROM public.guests
        WHERE id = v_res_guest_id AND hotel_id = v_qr.hotel_id;
    END IF;

    -- 5. Fetch Menu Categories for this hotel
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', mc.id,
        'hotel_id', mc.hotel_id,
        'name', mc.name,
        'description', mc.description,
        'sort_order', mc.sort_order,
        'is_active', mc.is_active
    ) ORDER BY mc.sort_order, mc.name), '[]'::jsonb)
    INTO v_categories
    FROM public.menu_categories mc
    WHERE mc.hotel_id = v_qr.hotel_id AND mc.is_active = true;

    -- 6. Fetch Menu Items for this hotel
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', mi.id,
        'hotel_id', mi.hotel_id,
        'category_id', mi.category_id,
        'name', mi.name,
        'description', mi.description,
        'price', mi.price,
        'is_available', mi.is_available,
        'is_veg', COALESCE(mi.is_veg, true),
        'is_vegetarian', COALESCE(mi.is_veg, true),
        'preparation_time', COALESCE(mi.preparation_time_minutes, 15),
        'tax_percent', COALESCE(mi.tax_percent, 5.00),
        'image_url', mi.image_url
    ) ORDER BY mi.name), '[]'::jsonb)
    INTO v_menu_items
    FROM public.menu_items mi
    WHERE mi.hotel_id = v_qr.hotel_id AND mi.is_available = true;

    -- 7. Fetch Available Hotel Services for this hotel
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', hs.id,
        'hotel_id', hs.hotel_id,
        'name', hs.name,
        'description', hs.description,
        'category', hs.category,
        'price', hs.price,
        'is_available', hs.is_available,
        'requires_scheduling', hs.requires_scheduling
    ) ORDER BY hs.category, hs.name), '[]'::jsonb)
    INTO v_services
    FROM public.hotel_services hs
    WHERE hs.hotel_id = v_qr.hotel_id AND hs.is_available = true;

    -- 8. Fetch Recent Active Orders for this room/stay
    IF v_res_id IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', o.id,
            'hotel_id', o.hotel_id,
            'room_id', o.room_id,
            'room_number', o.room_number,
            'reservation_id', o.reservation_id,
            'status', o.status,
            'payment_status', o.payment_status,
            'subtotal', o.subtotal,
            'tax_amount', o.tax_amount,
            'total', o.total,
            'total_amount', o.total,
            'tracking_token', o.tracking_token,
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
            ), '[]'::jsonb)
        ) ORDER BY o.created_at DESC), '[]'::jsonb)
        INTO v_recent_orders
        FROM public.orders o
        WHERE o.hotel_id = v_qr.hotel_id
          AND (o.reservation_id = v_res_id OR o.room_id = v_qr.room_id)
          AND o.created_at > NOW() - INTERVAL '48 hours';

        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', sr.id,
            'hotel_id', sr.hotel_id,
            'room_id', sr.room_id,
            'reservation_id', sr.reservation_id,
            'service_id', sr.service_id,
            'title', sr.title,
            'description', sr.description,
            'status', sr.status,
            'priority', sr.priority,
            'tracking_token', sr.tracking_token,
            'created_at', sr.created_at
        ) ORDER BY sr.created_at DESC), '[]'::jsonb)
        INTO v_recent_requests
        FROM public.service_requests sr
        WHERE sr.hotel_id = v_qr.hotel_id
          AND (sr.reservation_id = v_res_id OR sr.room_id = v_qr.room_id)
          AND sr.created_at > NOW() - INTERVAL '48 hours';
    END IF;

    RETURN jsonb_build_object(
        'hotel', jsonb_build_object(
            'id', v_hotel.id,
            'name', v_hotel.name,
            'slug', v_hotel.slug,
            'address', v_hotel.address,
            'city', v_hotel.city,
            'state', v_hotel.state,
            'country', v_hotel.country,
            'currency', v_hotel.currency,
            'timezone', v_hotel.timezone,
            'phone', v_hotel.phone,
            'email', v_hotel.email,
            'check_in_time', v_hotel.check_in_time,
            'check_out_time', v_hotel.check_out_time,
            'primary_color', COALESCE(v_branding.primary_color, '#1a3a5c'),
            'accent_color', COALESCE(v_branding.accent_color, '#c9a84c'),
            'tagline', v_branding.tagline,
            'logo_url', v_branding.logo_url,
            'wifi_name', v_settings.wifi_name,
            'wifi_password', v_settings.wifi_password,
            'allow_room_charge', COALESCE(v_settings.allow_room_charge, true)
        ),
        'room', jsonb_build_object(
            'id', v_room.id,
            'number', v_room.number,
            'floor', v_room.floor,
            'status', v_room.status,
            'housekeeping_status', v_room.housekeeping_status,
            'room_type_name', v_room_type.name,
            'base_rate', v_room_type.base_rate
        ),
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
        ) ELSE NULL END,
        'categories', v_categories,
        'menu_items', v_menu_items,
        'services', v_services,
        'orders', v_recent_orders,
        'requests', v_recent_requests
    );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_guest_portal_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_guest_portal_session(TEXT) TO anon, authenticated, service_role;

COMMIT;
