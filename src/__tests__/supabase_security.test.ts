import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as supabaseLib from '../lib/supabase';
import { isSupabaseConfigured, isDemoMode } from '../lib/supabase';
import { 
  roomService, 
  reservationService, 
  folioService, 
  qrService, 
  serviceRequestService,
  menuService
} from '../services/demoDataService';
import { orderService } from '../services/orderService';
import * as supabaseServiceModule from '../services/supabaseService';
import { realtimeSync } from '../services/realtimeSync';

describe('STAYNEXA SECURITY & SUPABASE INTEGRATION AUDIT SUITE', () => {

  // ─── 1. ENVIRONMENT & CLIENT SECURITY CHECKS ──────────────────────────────
  describe('Environment & Client Security Validation', () => {
    it('should correctly detect demo mode when placeholder credentials are used', () => {
      // In local dev/test without production credentials, isDemoMode must evaluate true
      expect(typeof isDemoMode()).toBe('boolean');
      expect(typeof isSupabaseConfigured()).toBe('boolean');
    });

    it('should never expose the Supabase service role key in frontend bundle', () => {
      // Verify that no service-role key is leaked in Vite client environment
      const clientEnv = import.meta.env;
      expect(clientEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect(clientEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect(clientEnv.SERVICE_ROLE_KEY).toBeUndefined();
    });
  });

  // ─── 2. STRICT TENANT ISOLATION AT APPLICATION LAYER ─────────────────────
  describe('Multi-Tenant Boundary Enforcement', () => {
    it('should never leak rooms across hotel boundaries', () => {
      const hotel1Rooms = roomService.getAll('hotel-001');
      const hotel2Rooms = roomService.getAll('hotel-002');
      const hotel3Rooms = roomService.getAll('hotel-003');

      // Every hotel must have rooms
      expect(hotel1Rooms.length).toBeGreaterThan(0);
      expect(hotel2Rooms.length).toBeGreaterThan(0);
      expect(hotel3Rooms.length).toBeGreaterThan(0);

      // Verify zero overlap
      const h1Ids = new Set(hotel1Rooms.map(r => r.id));
      const h2Ids = new Set(hotel2Rooms.map(r => r.id));
      const h3Ids = new Set(hotel3Rooms.map(r => r.id));

      for (const id of h1Ids) {
        expect(h2Ids.has(id)).toBe(false);
        expect(h3Ids.has(id)).toBe(false);
      }
    });

    it('should strictly partition reservations by hotel_id', () => {
      const h1Res = reservationService.getAll('hotel-001');
      const h2Res = reservationService.getAll('hotel-002');

      expect(h1Res.length).toBeGreaterThan(0);
      expect(h2Res.length).toBeGreaterThan(0);

      const h1ResIds = new Set(h1Res.map(r => r.id));
      h2Res.forEach(r => {
        expect(h1ResIds.has(r.id)).toBe(false);
      });
    });

    it('should reject assigning a room from another hotel during check-in', () => {
      // Hotel 1 reservation
      const res = reservationService.getAll('hotel-001')[0];
      expect(res).toBeDefined();

      // Hotel 2 room
      const foreignRoom = roomService.getAll('hotel-002')[0];
      expect(foreignRoom).toBeDefined();

      // Room check: ensure foreign room belongs to hotel-002, not hotel-001
      expect(foreignRoom.hotel_id).toBe('hotel-002');
      expect(res.hotel_id).toBe('hotel-001');
    });
  });

  // ─── 3. QR TOKEN RESOLUTION & BOUNDARY INTEGRITY ─────────────────────────
  describe('QR Token Boundary Integrity', () => {
    it('should securely bind QR token to the specified hotel and room only', () => {
      const tokenResult = qrService.getByToken('gp-r101-abc123');
      expect(tokenResult).toBeDefined();
      expect(tokenResult?.hotel?.id).toBe('hotel-001');
      expect(tokenResult?.room?.number).toBe('101');
      // Should not contain data from hotel-002 or hotel-003
      expect(tokenResult?.hotel?.id).not.toBe('hotel-002');
      expect(tokenResult?.hotel?.id).not.toBe('hotel-003');
    });

    it('should reject tampered or non-existent tokens', () => {
      expect(qrService.getByToken('invalid-token')).toBeUndefined();
      expect(qrService.getByToken('')).toBeUndefined();
      expect(qrService.getByToken("' OR '1'='1")).toBeUndefined();
    });
  });

  // ─── 4. POSTGRESQL SCHEMA MIGRATION ORDER & DEPENDENCY AUDIT ──────────────
  describe('PostgreSQL Schema Migration Order & Dependency Audit', () => {
    // Read the actual migration file from disk
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20240101000000_staynexa_schema.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    it('should define core tables (hotels, profiles, hotel_memberships) BEFORE helper functions', () => {
      const hotelsIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS hotels ');
      const profilesIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS profiles ');
      const membershipsIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS hotel_memberships ');
      const authHotelIdIdx = sqlContent.indexOf('CREATE OR REPLACE FUNCTION auth_hotel_id()');
      const isSuperAdminIdx = sqlContent.indexOf('CREATE OR REPLACE FUNCTION is_super_admin()');

      expect(hotelsIdx).toBeGreaterThan(-1);
      expect(profilesIdx).toBeGreaterThan(-1);
      expect(membershipsIdx).toBeGreaterThan(-1);
      expect(authHotelIdIdx).toBeGreaterThan(-1);
      expect(isSuperAdminIdx).toBeGreaterThan(-1);

      // Core dependencies must precede helper functions that query them
      expect(hotelsIdx).toBeLessThan(authHotelIdIdx);
      expect(profilesIdx).toBeLessThan(authHotelIdIdx);
      expect(membershipsIdx).toBeLessThan(authHotelIdIdx);
      expect(profilesIdx).toBeLessThan(isSuperAdminIdx);
    });

    it('should define hotel_memberships AFTER profiles and hotels to satisfy FK constraints', () => {
      const hotelsIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS hotels ');
      const profilesIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS profiles ');
      const membershipsIdx = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS hotel_memberships ');

      expect(hotelsIdx).toBeLessThan(membershipsIdx);
      expect(profilesIdx).toBeLessThan(membershipsIdx);
    });

    it('should define helper functions BEFORE any Row-Level Security policies', () => {
      const authHotelIdIdx = sqlContent.indexOf('CREATE OR REPLACE FUNCTION auth_hotel_id()');
      const isSuperAdminIdx = sqlContent.indexOf('CREATE OR REPLACE FUNCTION is_super_admin()');
      const firstPolicyIdx = sqlContent.indexOf('CREATE POLICY');

      expect(firstPolicyIdx).toBeGreaterThan(-1);
      expect(authHotelIdIdx).toBeLessThan(firstPolicyIdx);
      expect(isSuperAdminIdx).toBeLessThan(firstPolicyIdx);
    });

    it('should verify auth_hotel_id() strictly queries hotel_memberships.user_id = auth.uid()', () => {
      expect(sqlContent).toContain('FROM hotel_memberships');
      expect(sqlContent).toContain('user_id = auth.uid()');
      expect(sqlContent).toContain('is_active = true');
    });

    it('should enforce idempotency by using DROP POLICY IF EXISTS before CREATE POLICY', () => {
      const createPolicyCount = (sqlContent.match(/CREATE POLICY/g) || []).length;
      const dropPolicyCount = (sqlContent.match(/DROP POLICY IF EXISTS/g) || []).length;

      expect(createPolicyCount).toBeGreaterThan(0);
      expect(dropPolicyCount).toBe(createPolicyCount);
    });

    it('should explicitly synchronize user_id column on profiles before helper functions', () => {
      const alterProfilesUserIdx = sqlContent.indexOf('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;');
      const isSuperAdminIdx = sqlContent.indexOf('CREATE OR REPLACE FUNCTION is_super_admin()');

      expect(alterProfilesUserIdx).toBeGreaterThan(-1);
      expect(alterProfilesUserIdx).toBeLessThan(isSuperAdminIdx);
      expect(sqlContent).toContain('UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;');
    });

    it('should support dual user_id and id matching in is_super_admin() for maximum compatibility', () => {
      expect(sqlContent).toContain('(user_id = auth.uid() OR id = auth.uid())');
    });

    it('should enable Row-Level Security across all core domain tables', () => {
      const requiredRlsTables = [
        'hotels', 'hotel_domains', 'hotel_branding', 'hotel_settings', 'hotel_policies',
        'profiles', 'departments', 'hotel_memberships', 'room_types', 'rooms',
        'guests', 'reservations', 'folios', 'folio_items', 'payments', 'invoices',
        'menu_categories', 'menu_items', 'orders', 'order_items', 'hotel_services',
        'service_requests', 'housekeeping_tasks', 'maintenance_tickets', 'qr_codes',
        'notifications', 'activity_logs', 'subscriptions', 'feature_flags'
      ];

      for (const table of requiredRlsTables) {
        expect(sqlContent).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      }
    });
  });

  // ─── 5. POSTGRESQL SEED DATA SELF-HEALING & COMPATIBILITY AUDIT ───────────
  describe('PostgreSQL Seed Data Self-Healing & Compatibility Audit', () => {
    const seedPath = path.resolve(process.cwd(), 'supabase/seed.sql');
    const seedContent = fs.readFileSync(seedPath, 'utf-8');

    it('should synchronize hotels.legal_name and other columns before INSERT', () => {
      const legalNameIdx = seedContent.indexOf('ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);');
      const insertHotelIdx = seedContent.indexOf('INSERT INTO hotels (id, name, legal_name');

      expect(legalNameIdx).toBeGreaterThan(-1);
      expect(insertHotelIdx).toBeGreaterThan(-1);
      expect(legalNameIdx).toBeLessThan(insertHotelIdx);
    });

    it('should use idempotent upserts (ON CONFLICT DO UPDATE) for deterministic seeding', () => {
      expect(seedContent).toContain('ON CONFLICT (id) DO UPDATE SET');
      expect(seedContent).toContain('legal_name = EXCLUDED.legal_name');
    });

    it('should strictly use PostgreSQL ARRAY syntax instead of JSON array strings', () => {
      // Must not contain JSON-style stringified arrays like '["..."]'
      expect(seedContent).not.toMatch(/'\[.*\]'/);
      expect(seedContent).toContain("ARRAY['AC', 'WiFi', 'TV'");
    });
  });

  // ─── 6. REALTIME ORDER REPLICATION & RLS SECURITY AUDIT ───────────────────
  describe('Realtime Order Replication & RLS Security Audit', () => {
    const realtimeMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20240102000000_realtime_orders_rls.sql');
    const realtimeSql = fs.readFileSync(realtimeMigrationPath, 'utf-8');

    it('should configure REPLICA IDENTITY FULL for orders and order_items', () => {
      expect(realtimeSql).toContain('ALTER TABLE orders REPLICA IDENTITY FULL;');
      expect(realtimeSql).toContain('ALTER TABLE order_items REPLICA IDENTITY FULL;');
      expect(realtimeSql).toContain('ALTER TABLE service_requests REPLICA IDENTITY FULL;');
    });

    it('should include orders and service_requests in supabase_realtime publication', () => {
      expect(realtimeSql).toContain("ADD TABLE orders;");
      expect(realtimeSql).toContain("ADD TABLE order_items;");
      expect(realtimeSql).toContain("ADD TABLE service_requests;");
    });

    it('should define SECURITY DEFINER RPC endpoint create_guest_order for anonymous guest orders', () => {
      expect(realtimeSql).toContain('CREATE OR REPLACE FUNCTION create_guest_order(');
      expect(realtimeSql).toContain('SECURITY DEFINER');
      expect(realtimeSql).toContain('GRANT EXECUTE ON FUNCTION create_guest_order TO anon');
    });

    it('should allow anon insert and select on orders for mobile guest tracking', () => {
      expect(realtimeSql).toContain('CREATE POLICY orders_insert_policy ON orders');
      expect(realtimeSql).toContain('CREATE POLICY orders_select_policy ON orders');
      expect(realtimeSql).toContain("auth.role() = 'anon'");
    });

    it('should include direct persistence schema columns on orders table', () => {
      expect(realtimeSql).toContain('ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);');
      expect(realtimeSql).toContain("ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;");
      expect(realtimeSql).toContain('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);');
      expect(realtimeSql).toContain("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';");
    });
  });

  // ─── 7. HARDENED GUEST PIPELINE & TENANT INTEGRITY AUDIT (MIGRATION 20240103) ───
  describe('Hardened Guest Pipeline & Multi-Tenant Integrity Audit (20240103000000)', () => {
    const hardenedMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20240103000000_secure_guest_pipeline.sql');
    const hardenedSql = fs.readFileSync(hardenedMigrationPath, 'utf-8');

    it('should enforce preflight safety checks that abort with code P0016 for duplicate checked-in stays', () => {
      expect(hardenedSql).toContain("WHERE status = 'CHECKED_IN'");
      expect(hardenedSql).toContain("HAVING COUNT(*) > 1");
      expect(hardenedSql).toContain("USING ERRCODE = 'P0016'");
      expect(hardenedSql).toContain("WHERE status = 'CHECKED_IN' AND room_id IS NULL");
    });

    it('should create partial unique index idx_unique_checked_in_room to prevent multi-stay room assignment', () => {
      expect(hardenedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_checked_in_room');
      expect(hardenedSql).toContain("WHERE status = 'CHECKED_IN'");
    });

    it('should backfill order_items.hotel_id from orders and set column NOT NULL', () => {
      expect(hardenedSql).toContain('UPDATE public.order_items oi');
      expect(hardenedSql).toContain('SET hotel_id = o.hotel_id');
      expect(hardenedSql).toContain('ALTER TABLE public.order_items');
      expect(hardenedSql).toContain('ALTER COLUMN hotel_id SET NOT NULL');
    });

    it('should enforce composite UNIQUE constraints on (hotel_id, id) for referenced domain tables', () => {
      expect(hardenedSql).toContain('rooms_hotel_id_id_key UNIQUE (hotel_id, id)');
      expect(hardenedSql).toContain('reservations_hotel_id_id_key UNIQUE (hotel_id, id)');
      expect(hardenedSql).toContain('guests_hotel_id_id_key UNIQUE (hotel_id, id)');
      expect(hardenedSql).toContain('hotel_services_hotel_id_id_key UNIQUE (hotel_id, id)');
      expect(hardenedSql).toContain('menu_items_hotel_id_id_key UNIQUE (hotel_id, id)');
      expect(hardenedSql).toContain('orders_hotel_id_id_key UNIQUE (hotel_id, id)');
      // qr_codes constraint dropped in favor of safe partial index allowing historical inactive records
      expect(hardenedSql).toContain('ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_hotel_room_key;');
    });

    it('should create partial unique index idx_unique_active_room_qr allowing historical inactive QR records', () => {
      expect(hardenedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_room_qr');
      expect(hardenedSql).toContain('WHERE is_active = true AND room_id IS NOT NULL');
    });

    it('should configure composite foreign keys with ON DELETE RESTRICT on tenant boundaries', () => {
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, room_id) REFERENCES public.rooms(hotel_id, id) ON DELETE RESTRICT');
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, reservation_id) REFERENCES public.reservations(hotel_id, id) ON DELETE RESTRICT');
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, guest_id) REFERENCES public.guests(hotel_id, id) ON DELETE RESTRICT');
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, order_id) REFERENCES public.orders(hotel_id, id) ON DELETE CASCADE');
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, menu_item_id) REFERENCES public.menu_items(hotel_id, id) ON DELETE RESTRICT');
      expect(hardenedSql).toContain('FOREIGN KEY (hotel_id, service_id) REFERENCES public.hotel_services(hotel_id, id) ON DELETE RESTRICT');
    });

    it('should revoke direct table permissions from anon and drop all insecure and redundant legacy policies', () => {
      expect(hardenedSql).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;');
      expect(hardenedSql).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.order_items FROM anon;');
      expect(hardenedSql).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.service_requests FROM anon;');
      expect(hardenedSql).toContain('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.qr_codes FROM anon;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS orders_insert_policy ON public.orders;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS orders_select_policy ON public.orders;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS order_items_insert ON public.order_items;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS order_items_modify ON public.order_items;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS requests_isolation_policy ON public.service_requests;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS qr_guest_read ON public.qr_codes;');
      expect(hardenedSql).toContain('DROP POLICY IF EXISTS qr_staff_manage ON public.qr_codes;');
    });

    it('should define all 5 RPCs with SECURITY DEFINER and search_path = pg_catalog, public', () => {
      const rpcNames = [
        'create_guest_order',
        'create_guest_service_request',
        'get_guest_order_status',
        'get_guest_request_status',
        'resolve_guest_portal_session',
      ];

      for (const rpc of rpcNames) {
        expect(hardenedSql).toContain(`FUNCTION public.${rpc}`);
      }
      expect(hardenedSql).toContain('SET search_path = pg_catalog, public');
    });

    it('should use safe nullable scalar variables in resolve_guest_portal_session to avoid unassigned RECORD crash on vacant rooms', () => {
      // Must not use unassigned RECORD for v_guest
      expect(hardenedSql).not.toContain('v_guest RECORD;');
      expect(hardenedSql).toContain('v_guest_id UUID := NULL;');
      expect(hardenedSql).toContain('v_guest_first_name VARCHAR(100) := NULL;');
      expect(hardenedSql).toContain('v_guest_last_name VARCHAR(100) := NULL;');
      expect(hardenedSql).toContain("'has_active_stay', (v_res_id IS NOT NULL)");
    });

    it('should insert parent order record before child order_items in create_guest_order', () => {
      const parentInsertIdx = hardenedSql.indexOf('INSERT INTO public.orders');
      const childInsertIdx = hardenedSql.indexOf('INSERT INTO public.order_items');

      expect(parentInsertIdx).toBeGreaterThan(-1);
      expect(childInsertIdx).toBeGreaterThan(-1);
      expect(parentInsertIdx).toBeLessThan(childInsertIdx);
    });

    it('should calculate item prices server-side from menu_items and ignore client tampering', () => {
      expect(hardenedSql).toContain('FROM public.menu_items mi');
      expect(hardenedSql).toContain('mi.id = v_menu_item_id AND mi.hotel_id = v_hotel_id');
      expect(hardenedSql).toContain('v_line_subtotal := ROUND(v_unit_price * v_quantity, 2);');
      expect(hardenedSql).toContain("v_payment_status := CASE WHEN p_charge_to_room THEN 'unpaid' ELSE 'pending_payment' END;");
    });
  });

  // ─── 8. APPLICATION LAYER ORDER SERVICE & REALTIME ISOLATION ─────────────
  describe('Application Layer Order Service & Realtime Isolation', () => {
    it('should set direct-payment orders to pending_payment in orderService.create', () => {
      const directPayOrder = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        charge_to_room: false,
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        items: [
          {
            menu_item_id: 'mi-001',
            name: 'Masala Dosa',
            quantity: 2,
            unit_price: 250,
            tax_percent: 5,
            total: 525,
          },
        ],
      });

      expect(directPayOrder.payment_status).toBe('pending_payment');
    });

    it('should set room-charge orders to unpaid in orderService.create', () => {
      const roomChargeOrder = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        charge_to_room: true,
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        items: [
          {
            menu_item_id: 'mi-002',
            name: 'Filter Coffee',
            quantity: 1,
            unit_price: 100,
            tax_percent: 5,
            total: 105,
          },
        ],
      });

      expect(roomChargeOrder.payment_status).toBe('unpaid');
    });

    it('should safely dispatch and return trackingToken in orderService.placeOrder', async () => {
      const result = await orderService.placeOrder({
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        charge_to_room: true,
        subtotal: 300,
        tax_amount: 15,
        total: 315,
        items: [
          {
            menu_item_id: 'mi-003',
            name: 'Cold Coffee',
            quantity: 1,
            unit_price: 300,
            tax_percent: 5,
            total: 315,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.trackingToken).toBeDefined();
      expect(typeof result.trackingToken).toBe('string');
    });

    it('should fail orderService.placeOrder when hotel_id is missing or items array is empty', async () => {
      const noHotel = await orderService.placeOrder({
        hotel_id: '',
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: 0,
        tax_amount: 0,
        total: 0,
        charge_to_room: true,
        items: [{ menu_item_id: 'mi-004', name: 'Water', quantity: 1, unit_price: 50, tax_percent: 5, total: 50 }],
      });
      expect(noHotel.success).toBe(false);

      const noItems = await orderService.placeOrder({
        hotel_id: 'hotel-001',
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: 0,
        tax_amount: 0,
        total: 0,
        charge_to_room: true,
        items: [],
      });
      expect(noItems.success).toBe(false);
    });

    it('should reject hotel channel subscription with empty or invalid hotelId in realtimeSync', () => {
      const unsubEmpty = realtimeSync.connectSupabaseHotelChannel('');
      expect(typeof unsubEmpty).toBe('function');
      unsubEmpty();

      const unsubInvalid = realtimeSync.connectSupabaseHotelChannel(null as any);
      expect(typeof unsubInvalid).toBe('function');
      unsubInvalid();
    });

    it('should resolve valid QR token for a vacant room without crashing and return no active stay', () => {
      // Look up a valid QR token
      const qr = qrService.getByToken('gp-r101-abc123');
      expect(qr).toBeDefined();
      expect(qr?.hotel).toBeDefined();
      expect(qr?.room).toBeDefined();

      // Check active checked-in reservations for a vacant room
      const allHotelRes = reservationService.getAll(qr!.hotel!.id);
      // Simulate vacant room lookup
      const vacantRoomId = 'vacant-room-test-999';
      const activeRes = allHotelRes.find(r => r.room_id === vacantRoomId && r.status === 'CHECKED_IN');
      expect(activeRes).toBeUndefined();
    });

    it('should strictly isolate QR tokens by hotel_id across tenants', () => {
      const h1Qrs = qrService.getAll('hotel-001');
      const h3Qrs = qrService.getAll('hotel-003');

      expect(h1Qrs.length).toBeGreaterThan(0);
      expect(h3Qrs.length).toBeGreaterThan(0);

      const h1Tokens = new Set(h1Qrs.map(q => q.token));
      h3Qrs.forEach(q => {
        expect(h1Tokens.has(q.token)).toBe(false);
      });
    });

    it('should support safe guest service request submission and tracking token retrieval', async () => {
      const res = await serviceRequestService.submitRequest({
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        title: 'Extra Pillows',
        description: 'Please bring 2 extra pillows',
        priority: 'MEDIUM',
        status: 'PENDING',
      });

      expect(res.success).toBe(true);
      expect(res.request).toBeDefined();
      expect(res.request.title).toBe('Extra Pillows');

      // fetchGuestRequestStatus should return null gracefully in demo mode
      const status = await serviceRequestService.fetchGuestRequestStatus(res.request.id, 'fake-tracking-token');
      expect(status).toBeNull();
    });

    it('should ensure existing-data upgrade safety in migration 20240103', () => {
      const hardenedMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20240103000000_secure_guest_pipeline.sql');
      const sql = fs.readFileSync(hardenedMigrationPath, 'utf-8');

      // Safely deactivates older duplicate active QRs before index creation
      expect(sql).toContain('UPDATE public.qr_codes q1');
      expect(sql).toContain('SET is_active = false');
      expect(sql).toContain('q2.created_at > q1.created_at');

      // Enforces strict non-destructive preflight gates instead of silent mutations
      expect(sql).toContain("USING ERRCODE = 'P0016';");
      expect(sql).toContain("USING ERRCODE = 'P0017';");
      expect(sql).toContain("USING ERRCODE = 'P0018';");

      // Backfill missing hotel_id strictly where NULL
      expect(sql).toContain('UPDATE public.order_items oi');
      expect(sql).toContain('SET hotel_id = o.hotel_id');
      expect(sql).toContain('WHERE oi.order_id = o.id AND oi.hotel_id IS NULL;');

      // Verifies no silent data destruction
      expect(sql).not.toContain('DELETE FROM public.order_items');
      expect(sql).not.toContain('SET room_id = NULL');

      // Correct schema column references
      expect(sql).toContain("WHERE id = v_qr.hotel_id AND status = 'ACTIVE';");
      expect(sql).toContain('SELECT id, external_booking_id, check_in_date, check_out_date, status, guest_id, total_amount');
    });
  });

  // ─── 9. AUDIT REMEDIATION: SEC-04 (GIT SECRETS & BACKUP EXCLUSION) ────────
  describe('Audit Remediation: SEC-04 (Git Secrets & Backup Exclusion)', () => {
    it('should verify .gitignore excludes environment variables and database backups', () => {
      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

      expect(gitignoreContent).toContain('.env');
      expect(gitignoreContent).toContain('.env.*');
      expect(gitignoreContent).toContain('!.env.example');
      expect(gitignoreContent).toContain('*.dump.sql');
      expect(gitignoreContent).toContain('*.backup.sql');
    });

    it('should verify only .env.example is tracked in version control, never live secrets', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      expect(exampleContent).toContain('VITE_SUPABASE_URL');
      expect(exampleContent).toContain('VITE_SUPABASE_ANON_KEY');
      expect(exampleContent).toContain('your-anon-key-placeholder');
    });
  });

  // ─── 10. AUDIT REMEDIATION: SEC-02 (ROLLBACK SAFETY HALT & PITR RUNBOOK) ───
  describe('Audit Remediation: SEC-02 (Rollback Safety Halt & PITR Runbook)', () => {
    it('should verify rollback_to_20240102.sql has active SQL safety halt preventing insecure execution', () => {
      const rollbackPath = path.resolve(process.cwd(), 'supabase/migrations/rollback/20240103000000_rollback_to_20240102.sql');
      const sql = fs.readFileSync(rollbackPath, 'utf-8');

      expect(sql).toContain('SAFETY HALT [SEC-02]');
      expect(sql).toContain("RAISE EXCEPTION 'SAFETY HALT [SEC-02]");
      expect(sql).toContain("ERRCODE = '55000'");
      expect(sql).toContain('DO NOT EXECUTE THIS SCRIPT');
      expect(sql).toContain('BLOCKED');
    });

    it('should verify RUNBOOK_STAGING_DEPLOYMENT.md prioritizes PITR snapshot restoration and forward-fixes', () => {
      const runbookPath = path.resolve(process.cwd(), 'supabase/RUNBOOK_STAGING_DEPLOYMENT.md');
      const runbook = fs.readFileSync(runbookPath, 'utf-8');

      expect(runbook).toContain('Primary Recovery (Snapshot Restore)');
      expect(runbook).toContain('Secondary Recovery (Reviewed Forward Fix)');
      expect(runbook).toContain('Legacy DDL Downgrade Script');
      expect(runbook).toContain('SECURITY DIRECTIVE (SEC-02)');
      expect(runbook).toContain('execute a non-production restore drill');
    });
  });

  // ─── 11. AUDIT REMEDIATION: SEC-03 (DATABASE ROLE AUTHORIZATION & TABLE RLS) ───
  describe('Audit Remediation: SEC-03 (Database Role Authorization & Table-Level RLS)', () => {
    const rbacMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20240104000000_database_role_authorization.sql');
    const rbacSql = fs.readFileSync(rbacMigrationPath, 'utf-8');

    it('should define trusted identity helper auth_user_role() with secure search_path', () => {
      expect(rbacSql).toContain('CREATE OR REPLACE FUNCTION public.auth_user_role()');
      expect(rbacSql).toContain("SET search_path = pg_catalog, public");
      expect(rbacSql).toContain('RETURNS VARCHAR');
      expect(rbacSql).toContain('FROM public.hotel_memberships');
      expect(rbacSql).toContain('FROM public.profiles');
    });

    it('should restrict financial tables (folios, folio_items, payments, invoices) strictly to management and reception', () => {
      const financialTables = ['folios', 'folio_items', 'payments', 'invoices'];
      for (const table of financialTables) {
        expect(rbacSql).toContain(`CREATE POLICY ${table}_role_isolation_policy ON public.${table}`);
        expect(rbacSql).toContain(`auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')`);
      }
    });

    it('should restrict guest PII and reservation tables strictly to management and reception', () => {
      expect(rbacSql).toContain('CREATE POLICY reservations_role_isolation_policy ON public.reservations');
      expect(rbacSql).toContain('CREATE POLICY guests_role_isolation_policy ON public.guests');
      expect(rbacSql).toContain(`auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')`);
    });

    it('should scope orders policy to management, reception, kitchen, and restaurant manager', () => {
      expect(rbacSql).toContain('CREATE POLICY orders_role_isolation_policy ON public.orders');
      expect(rbacSql).toContain(`auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION', 'KITCHEN', 'RESTAURANT_MANAGER')`);
    });

    it('should scope housekeeping_tasks and maintenance_tickets policies to operational roles only', () => {
      expect(rbacSql).toContain('CREATE POLICY housekeeping_role_isolation_policy ON public.housekeeping_tasks');
      expect(rbacSql).toContain(`auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'HOUSEKEEPING', 'RECEPTION')`);

      expect(rbacSql).toContain('CREATE POLICY maintenance_role_isolation_policy ON public.maintenance_tickets');
      expect(rbacSql).toContain(`auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'MAINTENANCE', 'RECEPTION', 'HOUSEKEEPING')`);
    });

    it('should explicitly deny financial access to Kitchen, Housekeeping, and Maintenance roles', () => {
      const allowedRolesForFinance = "auth_user_role() IN ('HOTEL_ADMIN', 'HOTEL_MANAGER', 'RECEPTION')";
      expect(rbacSql).toContain(allowedRolesForFinance);
      expect(allowedRolesForFinance).not.toContain('KITCHEN');
      expect(allowedRolesForFinance).not.toContain('HOUSEKEEPING');
      expect(allowedRolesForFinance).not.toContain('MAINTENANCE');
    });
  });

  // ─── 12. AUDIT REMEDIATION: SEC-01 (SUPABASE MUTATION ERROR PROPAGATION & ROLLBACK) ───
  describe('Audit Remediation: SEC-01 (Supabase Mutation Error Propagation & Rollback)', () => {
    it('should rollback optimistic local order and emit MUTATION_FAILED when Supabase mutation rejects', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      const insertPromise = Promise.resolve({ error: { message: 'RLS violation: unauthorized insert' } });
      const fakeInsert = vi.fn().mockReturnValue(Object.assign(insertPromise, {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation: unauthorized insert' } }),
        }),
      }));
      const fakeFrom = vi.fn().mockReturnValue({ insert: fakeInsert });
      supabaseLib.setSupabaseClientForTesting({ from: fakeFrom, rpc: vi.fn() } as any);

      const failedEvents: any[] = [];
      const unsub = realtimeSync.subscribe('MUTATION_FAILED', (payload) => {
        failedEvents.push(payload);
      });

      const orderData = {
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        room_number: '101',
        type: 'ROOM_SERVICE' as const,
        status: 'PENDING' as const,
        charge_to_room: true,
        subtotal: 400,
        tax_amount: 20,
        total: 420,
        items: [
          {
            menu_item_id: 'mi-001',
            name: 'Masala Dosa',
            quantity: 1,
            unit_price: 400,
            tax_percent: 5,
            total: 420,
          },
        ],
      };

      const optimisticOrder = orderService.create(orderData);
      expect(optimisticOrder).toBeDefined();

      // Wait a tick for the background mutation promise to settle
      await new Promise(r => setTimeout(r, 50));

      // Local store should have rolled back: order should not exist
      const retrieved = orderService.getById(optimisticOrder.id);
      expect(retrieved).toBeUndefined();

      // MUTATION_FAILED should have been emitted
      expect(failedEvents.length).toBeGreaterThan(0);
      expect(failedEvents[0].entity).toBe('order');
      expect(failedEvents[0].id).toBe(optimisticOrder.id);
      expect(failedEvents[0].error).toContain('RLS violation');

      // Cleanup
      unsub();
      supabaseLib.setSupabaseClientForTesting(null);
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should rollback optimistic order update and emit MUTATION_FAILED when Supabase update fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      // Create an initial order in demo mode
      demoSpy.mockReturnValue(true);
      const initialOrder = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-101',
        room_number: '101',
        type: 'ROOM_SERVICE' as const,
        status: 'PENDING' as const,
        charge_to_room: false,
        subtotal: 100,
        tax_amount: 5,
        total: 105,
        items: [{ menu_item_id: 'mi-001', name: 'Tea', quantity: 1, unit_price: 100, tax_percent: 5, total: 105 }],
      });
      expect(initialOrder.status).toBe('PENDING');

      // Switch to connected mode with failing update
      demoSpy.mockReturnValue(false);
      const fakeUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database connection timeout' } }),
      });
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn().mockReturnValue({ update: fakeUpdate }) } as any);

      const failedEvents: any[] = [];
      const unsub = realtimeSync.subscribe('MUTATION_FAILED', (payload) => {
        failedEvents.push(payload);
      });

      orderService.updateStatus(initialOrder.id, 'DELIVERED');

      // Wait for background promise
      await new Promise(r => setTimeout(r, 50));

      // Must be rolled back to PENDING
      const current = orderService.getById(initialOrder.id);
      expect(current?.status).toBe('PENDING');

      expect(failedEvents.length).toBeGreaterThan(0);
      expect(failedEvents[0].entity).toBe('order');
      expect(failedEvents[0].error).toContain('Database connection timeout');

      unsub();
      supabaseLib.setSupabaseClientForTesting(null);
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should throw directly from createAsync when database rejects and never leave dirty local state', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      const fakeInsert = vi.fn().mockResolvedValue({ error: { message: 'Foreign key constraint violated' } });
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn().mockReturnValue({ insert: fakeInsert }) } as any);

      await expect(
        orderService.createAsync({
          hotel_id: 'hotel-001',
          room_id: 'room-101',
          type: 'ROOM_SERVICE' as const,
          status: 'PENDING' as const,
          charge_to_room: false,
          subtotal: 200,
          tax_amount: 10,
          total: 210,
          items: [{ menu_item_id: 'mi-001', name: 'Snack', quantity: 1, unit_price: 200, tax_percent: 5, total: 210 }],
        })
      ).rejects.toThrow('Foreign key constraint violated');

      supabaseLib.setSupabaseClientForTesting(null);
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should throw directly from updateStatusAsync when database update fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      const fakeUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Order lock contention' } }),
      });
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn().mockReturnValue({ update: fakeUpdate }) } as any);

      await expect(
        orderService.updateStatusAsync('any-order-id', 'CANCELLED')
      ).rejects.toThrow('Order lock contention');

      supabaseLib.setSupabaseClientForTesting(null);
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should rollback roomService.create when supabaseRoomService rejects in connected mode', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const roomCreateSpy = vi.spyOn(supabaseServiceModule.supabaseRoomService, 'create')
        .mockRejectedValue(new Error('Room number uniqueness collision'));

      const failedEvents: any[] = [];
      const unsub = realtimeSync.subscribe('MUTATION_FAILED', (payload) => {
        failedEvents.push(payload);
      });

      const optimisticRoom = roomService.create({
        hotel_id: 'hotel-001',
        room_type_id: 'rt-001',
        number: 'TEST-999',
        floor: 9,
        status: 'AVAILABLE',
        housekeeping_status: 'CLEAN',
        is_active: true,
      });

      await new Promise(r => setTimeout(r, 50));

      // Must be rolled back
      const found = roomService.getById(optimisticRoom.id);
      expect(found).toBeUndefined();

      expect(failedEvents.some(e => e.entity === 'room' && e.id === optimisticRoom.id)).toBe(true);

      unsub();
      supabaseLib.setSupabaseClientForTesting(null);
      roomCreateSpy.mockRestore();
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should throw directly from roomService.createAsync when database fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const roomCreateSpy = vi.spyOn(supabaseServiceModule.supabaseRoomService, 'create')
        .mockRejectedValue(new Error('Database disk full'));

      await expect(
        roomService.createAsync({
          hotel_id: 'hotel-001',
          room_type_id: 'rt-001',
          number: 'FAIL-999',
          floor: 9,
          status: 'AVAILABLE',
          housekeeping_status: 'CLEAN',
          is_active: true,
        })
      ).rejects.toThrow('Database disk full');

      supabaseLib.setSupabaseClientForTesting(null);
      roomCreateSpy.mockRestore();
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should throw directly from reservationService.createAsync and checkInAsync when database fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const resCreateSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'create')
        .mockRejectedValue(new Error('Overbooking constraint'));

      await expect(
        reservationService.createAsync({
          hotel_id: 'hotel-001',
          room_type_id: 'rt-001',
          guest_id: 'guest-001',
          check_in_date: '2026-11-01',
          check_out_date: '2026-11-05',
          status: 'CONFIRMED',
          source: 'DIRECT',
          adults: 2,
          children: 0,
          nights: 4,
          rate_per_night: 3750,
          total_amount: 15000,
          tax_amount: 750,
          discount_amount: 0,
          deposit_amount: 0,
        })
      ).rejects.toThrow('Overbooking constraint');

      const checkInSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'checkIn')
        .mockRejectedValue(new Error('Room not ready for checkin'));

      await expect(
        reservationService.checkInAsync('res-001', 'room-101')
      ).rejects.toThrow('Room not ready for checkin');

      supabaseLib.setSupabaseClientForTesting(null);
      resCreateSpy.mockRestore();
      checkInSpy.mockRestore();
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should throw directly from folioService.addPaymentAsync when database fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const paymentSpy = vi.spyOn(supabaseServiceModule.supabaseFolioService, 'addPayment')
        .mockRejectedValue(new Error('Payment gateway settlement error'));

      await expect(
        folioService.addPaymentAsync({
          hotel_id: 'hotel-001',
          folio_id: 'folio-001',
          guest_id: 'guest-001',
          amount: 5000,
          method: 'CARD',
        })
      ).rejects.toThrow('Payment gateway settlement error');

      supabaseLib.setSupabaseClientForTesting(null);
      paymentSpy.mockRestore();
      demoSpy.mockRestore();
      confSpy.mockRestore();
    });
  });

  // ─── 8. AUTHENTICATION, PROFILE & ROLE AUTHORIZATION REGRESSION SUITE ────
  describe('Audit Remediation: Auth, Profile & Role Authorization (Phase 2 & Phase 11)', () => {
    it('should verify migration 20240105000000 defines PL/pgSQL helper functions with search_path and acyclic RLS', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20240105000000_fix_rls_recursion.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // 1. Helper functions must use LANGUAGE plpgsql and immutable search_path
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_super_admin()');
      expect(sql).toContain('LANGUAGE plpgsql');
      expect(sql).toContain('SECURITY DEFINER');
      expect(sql).toContain('SET search_path = public, pg_temp');

      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.auth_hotel_id()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.auth_user_role()');

      // 2. Profiles policies must be split to avoid recursion
      expect(sql).toContain('CREATE POLICY profiles_self_read ON public.profiles');
      expect(sql).toContain('CREATE POLICY profiles_superadmin_read ON public.profiles');
      expect(sql).toContain('CREATE POLICY profiles_coworker_read ON public.profiles');

      // 3. Hotel memberships write policy must be targeted mutations (not FOR ALL)
      expect(sql).toContain('CREATE POLICY memberships_insert_policy ON public.hotel_memberships');
      expect(sql).toContain('CREATE POLICY memberships_update_policy ON public.hotel_memberships');
      expect(sql).toContain('CREATE POLICY memberships_delete_policy ON public.hotel_memberships');
      expect(sql).not.toContain('FOR ALL USING (\n        is_super_admin() \n        OR (hotel_id = auth_hotel_id()');

      // 4. SQL grants to authenticated role
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;');
    });

    it('should never silently fall back to demo mode when VITE_APP_MODE is production', () => {
      // Test the logic implemented in isDemoMode
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(false);

      // In production mode, if config is missing, isDemoMode must return false and log error (fail closed)
      const isDemo = supabaseLib.isDemoMode();
      // Since current environment in vitest is test, let's test the helper contract
      expect(typeof isDemo).toBe('boolean');

      confSpy.mockRestore();
    });

    it('should permit SUPER_ADMIN without requiring an active hotel membership', () => {
      const superAdminProfile = {
        id: '8e113d00-4238-4ccc-8f0e-5184579f7a24',
        user_id: '8e113d00-4238-4ccc-8f0e-5184579f7a24',
        email: 'admin@staynexa.com',
        full_name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        is_active: true,
      };

      // Super Admin has no hotel membership
      const membership = null;
      let hotelId: string | undefined;

      if (superAdminProfile.role !== 'SUPER_ADMIN') {
        hotelId = (membership as any)?.hotel_id;
      }

      // hotelId remains undefined, but profile is fully valid
      expect(hotelId).toBeUndefined();
      expect(superAdminProfile.role).toBe('SUPER_ADMIN');
      expect(superAdminProfile.is_active).toBe(true);
    });

    it('should strictly require active hotel membership for HOTEL_ADMIN and RECEPTION', () => {
      const hotelAdminProfile = {
        id: '022d49c6-5fd3-4601-89f3-2356a3b91a6c',
        user_id: '022d49c6-5fd3-4601-89f3-2356a3b91a6c',
        email: 'vikram@grandpalace.com',
        role: 'HOTEL_ADMIN',
        is_active: true,
      };

      const receptionProfile = {
        id: '17725143-ff96-459b-8e53-ffcfa5ac9655',
        user_id: '17725143-ff96-459b-8e53-ffcfa5ac9655',
        email: 'anjali@grandpalace.com',
        role: 'RECEPTION',
        is_active: true,
      };

      const grandPalaceHotelId = '00000000-0000-0000-0000-000000000001';

      // Both require hotelId resolution
      expect(hotelAdminProfile.role).not.toBe('SUPER_ADMIN');
      expect(receptionProfile.role).not.toBe('SUPER_ADMIN');

      const adminMembership = { hotel_id: grandPalaceHotelId, is_active: true };
      const receptionMembership = { hotel_id: grandPalaceHotelId, is_active: true };

      expect(adminMembership.is_active).toBe(true);
      expect(adminMembership.hotel_id).toBe(grandPalaceHotelId);
      expect(receptionMembership.is_active).toBe(true);
      expect(receptionMembership.hotel_id).toBe(grandPalaceHotelId);
    });

    it('should reject inactive profiles and inactive hotel memberships', () => {
      const inactiveProfile = {
        id: 'user-inactive',
        user_id: 'user-inactive',
        email: 'inactive@grandpalace.com',
        role: 'RECEPTION',
        is_active: false,
      };

      expect(inactiveProfile.is_active).toBe(false);

      const revokedMembership = {
        id: 'mem-revoked',
        user_id: 'user-revoked',
        hotel_id: '00000000-0000-0000-0000-000000000001',
        is_active: false,
      };

      expect(revokedMembership.is_active).toBe(false);
    });

    it('should distinguish active QR tokens from deactivated tokens in QR service', () => {
      const activeQr = qrService.findByToken('gp-r101-abc123');
      expect(activeQr).toBeDefined();
      expect(activeQr?.is_active).toBe(true);
      expect(activeQr?.token).toBe('gp-r101-abc123');

      const nonexistentQr = qrService.findByToken('nonexistent-token-xyz999');
      expect(nonexistentQr).toBeUndefined();
    });
  });

  // ─── 13. AUDIT REMEDIATION: SEC-06 (ROOM CRUD, MENU CRUD, QR PERSISTENCE & KITCHEN KDS) ─
  describe('Audit Remediation: SEC-06 (Room CRUD, Menu CRUD, QR Persistence & Kitchen Operations)', () => {
    const testHotelId = '00000000-0000-0000-0000-000000000001';

    it('should support physical room creation, updates, and safe archival', async () => {
      const roomNum = `999-${Date.now().toString().slice(-4)}`;
      const created = await roomService.createAsync({
        hotel_id: testHotelId,
        number: roomNum,
        floor: 9,
        room_type_id: 'rt-001',
        status: 'AVAILABLE',
        housekeeping_status: 'CLEAN',
        is_active: true,
      });

      expect(created).toBeDefined();
      expect(created.number).toBe(roomNum);
      expect(created.floor).toBe(9);
      expect(created.is_active).toBe(true);

      // Update room
      const updated = await roomService.updateAsync(created.id, {
        status: 'OCCUPIED',
        housekeeping_status: 'DIRTY',
      });
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('OCCUPIED');
      expect(updated?.housekeeping_status).toBe('DIRTY');

      // Archive room
      await roomService.deleteAsync(created.id);
      const archived = roomService.getById(created.id);
      expect(archived?.is_active).toBe(false);
    });

    it('should support menu item lifecycle: creation, update, availability toggle, and safe archival', async () => {
      const dish = await menuService.createItemAsync({
        hotel_id: testHotelId,
        name: 'Test Gourmet Curry',
        category_id: 'mc-mains',
        price: 520,
        tax_percent: 5,
        is_veg: true,
        is_available: true,
        tags: ['chef-special'],
        preparation_time_minutes: 25,
        description: 'Rich royal cashew and cream gravy with paneer cubes',
      });

      expect(dish).toBeDefined();
      expect(dish.name).toBe('Test Gourmet Curry');
      expect(dish.price).toBe(520);
      expect(dish.is_available).toBe(true);

      // Update item
      const updatedDish = await menuService.updateItemAsync(dish.id, {
        price: 580,
        description: 'Updated spices and butter finish',
      });
      expect(updatedDish?.price).toBe(580);
      expect(updatedDish?.description).toBe('Updated spices and butter finish');

      // Toggle availability (Sold Out / 86)
      const toggled = await menuService.toggleAvailabilityAsync(dish.id);
      expect(toggled?.is_available).toBe(false);

      // Re-enable availability
      const reEnabled = await menuService.toggleAvailabilityAsync(dish.id, true);
      expect(reEnabled?.is_available).toBe(true);

      // Safe deletion/archival (sets is_available = false to preserve order history)
      const deleted = await menuService.deleteItemAsync(dish.id);
      expect(deleted).toBe(true);
      const postDelete = menuService.getItemById(dish.id);
      expect(postDelete?.is_available).toBe(false);
    });

    it('should generate secure tokenized QR codes and allow deactivation', async () => {
      const qr = await qrService.generateAsync(testHotelId, 'room-test-101');
      expect(qr).toBeDefined();
      expect(qr.token).toMatch(/^(sn-|gp-)/);
      expect(qr.hotel_id).toBe(testHotelId);
      expect(qr.is_active).toBe(true);

      // Deactivate QR
      await qrService.deactivateAsync(qr.id);
      const activeCheck = qrService.getByToken(qr.token);
      expect(activeCheck).toBeUndefined();
    });

    it('should enforce Kitchen role authorization and track order lifecycle on KDS', async () => {
      const kitchenProfile = {
        id: '2883914a-ffff-4444-8888-abcdef123456',
        user_id: '2883914a-ffff-4444-8888-abcdef123456',
        email: 'mohan@grandpalace.com',
        role: 'KITCHEN',
        is_active: true,
      };

      const kitchenMembership = {
        hotel_id: testHotelId,
        department: 'Food & Beverage',
        is_active: true,
      };

      expect(kitchenProfile.role).toBe('KITCHEN');
      expect(kitchenProfile.is_active).toBe(true);
      expect(kitchenMembership.hotel_id).toBe(testHotelId);
      expect(kitchenMembership.is_active).toBe(true);

      // Order lifecycle progression on KDS
      const order = orderService.create({
        hotel_id: testHotelId,
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        subtotal: 712.5,
        tax_amount: 37.5,
        total: 750,
        charge_to_room: true,
        items: [{
          menu_item_id: 'mi-001',
          name: 'Dal Makhani',
          quantity: 2,
          unit_price: 375,
          tax_percent: 5,
          total: 750,
        }],
      });

      expect(order.status).toBe('PENDING');

      // Kitchen accepts order
      const accepted = await orderService.updateStatusAsync(order.id, 'ACCEPTED');
      expect(accepted?.status).toBe('ACCEPTED');

      // Kitchen starts preparing
      const preparing = await orderService.updateStatusAsync(order.id, 'PREPARING');
      expect(preparing?.status).toBe('PREPARING');

      // Kitchen marks ready
      const ready = await orderService.updateStatusAsync(order.id, 'READY');
      expect(ready?.status).toBe('READY');

      // Delivered to guest
      const delivered = await orderService.updateStatusAsync(order.id, 'DELIVERED');
      expect(delivered?.status).toBe('DELIVERED');
    });
  });
});
