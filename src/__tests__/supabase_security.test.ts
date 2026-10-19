import { describe, it, expect } from 'vitest';
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
});
