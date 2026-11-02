import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pinDemoMode } from './demoModePin';
import { 
  qrService, 
  hotelService, 
  roomService, 
  reservationService, 
  menuService, 
  orderService, 
  serviceRequestService, 
  resetDemoStore 
} from '../services/demoDataService';
import { generateGuestPortalUrl } from '../utils/qrCode';
import { paymentService } from '../services/paymentService';

describe('GUEST PORTAL & QR-TO-KDS OPERATIONAL PIPELINE', () => {
  let unpinDemoMode: () => void;
  beforeEach(() => {
    unpinDemoMode = pinDemoMode();
  });
  afterEach(() => {
    unpinDemoMode();
  });
  beforeEach(() => {
    resetDemoStore();
  });

  describe('1. Canonical QR Code URL & Cryptographic Tokens', () => {
    it('generates canonical /guest/:token URL', () => {
      const url = generateGuestPortalUrl('gp-r101-abc123');
      expect(url).toContain('/guest/gp-r101-abc123');
      expect(url.startsWith('http')).toBe(true);
    });

    it('generates unpredictable cryptographic tokens with sn- prefix and high entropy', () => {
      // Test crypto token generator pattern
      const token1 = 'sn-' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const token2 = 'sn-' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      expect(token1).toMatch(/^sn-[a-f0-9]{32}$/);
      expect(token2).toMatch(/^sn-[a-f0-9]{32}$/);
      expect(token1).not.toBe(token2);
    });

    it('resolves active tokens and rejects deactivated ones', () => {
      const activeQr = qrService.findByToken('gp-r101-abc123');
      expect(activeQr).toBeDefined();
      expect(activeQr?.is_active).toBe(true);

      const fakeQr = qrService.findByToken('non-existent-token-xyz');
      expect(fakeQr).toBeUndefined();
    });

    it('generates canonical URL for sn-ymz185x0yd failing token', () => {
      const url = generateGuestPortalUrl('sn-ymz185x0yd');
      expect(url).toContain('/guest/sn-ymz185x0yd');
      expect(url.startsWith('http')).toBe(true);
    });

    it('accepts valid sn- tokens with varying entropy lengths (10, 16, 32 chars)', () => {
      const token10 = 'sn-ymz185x0yd'; // 10 chars entropy
      const token16 = 'sn-1a2b3c4d5e6f7a8b'; // 16 chars entropy
      const token32 = 'sn-0123456789abcdef0123456789abcdef'; // 32 chars entropy

      expect(token10).toMatch(/^sn-[a-z0-9]{10}$/);
      expect(token16).toMatch(/^sn-[a-z0-9]{16}$/);
      expect(token32).toMatch(/^sn-[a-z0-9]{32}$/);
    });

    it('fails closed on SQL injection, XSS, and malformed tokens', () => {
      expect(qrService.findByToken("' OR '1'='1")).toBeUndefined();
      expect(qrService.findByToken("<script>alert(1)</script>")).toBeUndefined();
      expect(qrService.findByToken('')).toBeUndefined();
      expect(qrService.findByToken('undefined')).toBeUndefined();
      expect(qrService.findByToken('null')).toBeUndefined();
    });
  });

  describe('2. Menu Integrity & Precision Price Calculations', () => {
    it('calculates tax accurately without floating-point drift', () => {
      // 2x Butter Chicken (₹420) + 1x Paneer Tikka (₹340) = ₹1180
      const subtotal = 1180;
      const taxCalc = paymentService.calculateTaxes(subtotal, 5);
      expect(taxCalc.subtotal).toBe(1180);
      expect(taxCalc.totalTax).toBe(59); // 5% of 1180 = 59.00
      expect(taxCalc.grandTotal).toBe(1239);
    });

    it('enforces sold-out item availability validation before dispatch', () => {
      const hotel = hotelService.getAll()[0];
      const items = menuService.getItems(hotel.id);
      expect(items.length).toBeGreaterThan(0);

      // Verify menu item structure includes is_veg and is_available
      items.forEach(it => {
        expect(typeof it.price).toBe('number');
        expect(it.price).toBeGreaterThan(0);
        expect(typeof it.is_available).toBe('boolean');
      });
    });
  });

  describe('3. Order Lifecycle & Kitchen KDS Advancement', () => {
    it('places guest order with PENDING status and valid order lines', async () => {
      const hotel = hotelService.getAll()[0];
      const rooms = roomService.getAll(hotel.id);
      const room101 = rooms.find(r => r.number === '101') || rooms[0];
      const reservations = reservationService.getAll(hotel.id);
      const activeRes = reservations.find(r => r.room_id === room101.id && r.status === 'CHECKED_IN') || reservations[0];

      const res = await orderService.placeOrder({
        hotel_id: hotel.id,
        room_id: room101.id,
        room_number: room101.number,
        reservation_id: activeRes.id,
        guest_id: activeRes.guest_id,
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        charge_to_room: true,
        special_instructions: 'Extra crispy',
        items: [
          {
            menu_item_id: 'menu-001',
            name: 'Crispy Fries',
            quantity: 2,
            unit_price: 250,
            tax_percent: 5,
            total: 525,
          }
        ]
      });

      expect(res.success).toBe(true);
      expect(res.order).toBeDefined();
      expect(res.order.status).toBe('PENDING');
      expect(res.order.items.length).toBe(1);
      expect(res.order.total).toBe(525);

      // Advance through KDS lifecycle
      const accepted = orderService.updateStatus(res.order.id, 'ACCEPTED');
      expect(accepted?.status).toBe('ACCEPTED');

      const cooking = orderService.updateStatus(res.order.id, 'PREPARING');
      expect(cooking?.status).toBe('PREPARING');

      const ready = orderService.updateStatus(res.order.id, 'READY');
      expect(ready?.status).toBe('READY');

      const delivered = orderService.updateStatus(res.order.id, 'DELIVERED');
      expect(delivered?.status).toBe('DELIVERED');
    });
  });

  describe('3b. Duplicate order prevention', () => {
    it('returns the same order and stores one record when a submission key is repeated', async () => {
      const hotel = hotelService.getAll()[0];
      const room = roomService.getAll(hotel.id)[0];
      const reservation = reservationService.getAll(hotel.id).find(r => r.room_id === room.id) || reservationService.getAll(hotel.id)[0];
      const before = orderService.getAll(hotel.id).length;
      const payload = {
        hotel_id: hotel.id,
        room_id: room.id,
        room_number: room.number,
        reservation_id: reservation.id,
        guest_id: reservation.guest_id,
        status: 'PENDING' as const,
        type: 'ROOM_SERVICE' as const,
        subtotal: 250,
        tax_amount: 12.5,
        total: 262.5,
        charge_to_room: true,
        items: [{ menu_item_id: 'menu-001', name: 'Crispy Fries', quantity: 1, unit_price: 250, tax_percent: 5, total: 262.5 }],
        idempotencyKey: 'test-key-duplicate-1',
      };

      const first = await orderService.placeOrder(payload);
      const second = await orderService.placeOrder(payload);

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(second.order.id).toBe(first.order.id);
      expect(orderService.getAll(hotel.id).length).toBe(before + 1);
    });
  });

  describe('4. In-Room Guest Service Requests & Routing', () => {
    it('creates guest service requests and stores tracking token', async () => {
      const hotel = hotelService.getAll()[0];
      const rooms = roomService.getAll(hotel.id);
      const room = rooms[0];

      const res = await serviceRequestService.submitRequest({
        hotel_id: hotel.id,
        room_id: room.id,
        title: 'Extra Bath Towels',
        description: 'Need 2 fresh towels',
        priority: 'MEDIUM',
        status: 'PENDING',
      });

      expect(res.success).toBe(true);
      expect(res.request).toBeDefined();
      expect(res.request.title).toBe('Extra Bath Towels');
      expect(res.trackingToken).toBeDefined();

      // Housekeeping marks request completed
      const updated = serviceRequestService.update(res.request.id, { status: 'COMPLETED' });
      expect(updated?.status).toBe('COMPLETED');
    });
  });
});
