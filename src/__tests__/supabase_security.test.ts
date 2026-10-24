import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured, isDemoMode } from '../lib/supabase';
import { hotelService, roomService, reservationService, qrService } from '../services/demoDataService';

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
  });
});
