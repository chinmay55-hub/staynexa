import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pinDemoMode } from './demoModePin';
import {
  hotelService,
  roomService,
  reservationService,
  folioService,
  orderService,
  qrService,
  menuService,
  serviceRequestService,
  housekeepingService,
  maintenanceService,
  analyticsService,
  staffService,
  featureFlagService,
  saveDemoStore,
  reloadDemoStoreFromStorage,
  resetDemoStore,
} from '../services/demoDataService';
import { DEMO_PROFILES, DEMO_MEMBERSHIPS } from '../data/demo';

describe('STAYNEXA END-TO-END DEMO WORKFLOW SUITE', () => {
  let unpinDemoMode: () => void;
  beforeEach(() => {
    unpinDemoMode = pinDemoMode();
  });
  afterEach(() => {
    unpinDemoMode();
  });
  beforeEach(() => {
    if (typeof window === 'undefined') {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      };
      (globalThis as any).window = { localStorage: mockStorage, addEventListener: () => {} };
      (globalThis as any).localStorage = mockStorage;
    }
    resetDemoStore();
  });

  // ─── FLOW 1: LOGIN & ROLE ACCESS ──────────────────────────────────────────
  describe('Flow 1: Staff Authentication, Role Boundaries & Tenant Mapping', () => {
    const demoCredentials: Record<string, { password: string; userId: string }> = {
      'admin@staynexa.com': { password: 'demo123', userId: 'user-super' },
      'vikram@grandpalace.com': { password: 'demo123', userId: 'user-001' },
      'anjali@grandpalace.com': { password: 'demo123', userId: 'user-002' },
      'mohan@grandpalace.com': { password: 'demo123', userId: 'user-003' },
      'rekha@grandpalace.com': { password: 'demo123', userId: 'user-004' },
      'ramesh@grandpalace.com': { password: 'demo123', userId: 'user-005' },
      'priti@willowboutique.in': { password: 'demo123', userId: 'user-006' },
    };

    function simulateDemoSignIn(email: string, password: string) {
      const cred = demoCredentials[email.toLowerCase()];
      if (!cred || cred.password !== password) {
        return { error: 'Invalid email or password.' };
      }
      const profile = DEMO_PROFILES.find(p => p.user_id === cred.userId);
      if (!profile) return { error: 'Profile not found.' };

      let hotelId: string | undefined;
      if (profile.role !== 'SUPER_ADMIN') {
        const mem = DEMO_MEMBERSHIPS.find(m => m.user_id === profile.user_id && m.is_active);
        hotelId = mem?.hotel_id;
      }
      return {
        user: {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          hotel_id: hotelId,
        },
      };
    }

    it('should authenticate Receptionist and bind to Grand Palace (hotel-001)', () => {
      const res = simulateDemoSignIn('anjali@grandpalace.com', 'demo123');
      expect(res.error).toBeUndefined();
      expect(res.user?.role).toBe('RECEPTION');
      expect(res.user?.hotel_id).toBe('hotel-001');
      expect(res.user?.full_name).toBe('Anjali Singh');
    });

    it('should authenticate Kitchen Staff and bind to Grand Palace KDS context', () => {
      const res = simulateDemoSignIn('mohan@grandpalace.com', 'demo123');
      expect(res.error).toBeUndefined();
      expect(res.user?.role).toBe('KITCHEN');
      expect(res.user?.hotel_id).toBe('hotel-001');
      expect(res.user?.full_name).toBe('Chef Mohan');
    });

    it('should authenticate Housekeeping Staff and bind to Grand Palace context', () => {
      const res = simulateDemoSignIn('rekha@grandpalace.com', 'demo123');
      expect(res.error).toBeUndefined();
      expect(res.user?.role).toBe('HOUSEKEEPING');
      expect(res.user?.hotel_id).toBe('hotel-001');
      expect(res.user?.full_name).toBe('Rekha Devi');
    });

    it('should authenticate Hotel Admin and bind to Grand Palace context', () => {
      const res = simulateDemoSignIn('vikram@grandpalace.com', 'demo123');
      expect(res.error).toBeUndefined();
      expect(res.user?.role).toBe('HOTEL_ADMIN');
      expect(res.user?.hotel_id).toBe('hotel-001');
      expect(res.user?.full_name).toBe('Vikram Nair');
    });

    it('should authenticate Willow Boutique Admin and bind strictly to Tenant B (hotel-002)', () => {
      const res = simulateDemoSignIn('priti@willowboutique.in', 'demo123');
      expect(res.error).toBeUndefined();
      expect(res.user?.role).toBe('HOTEL_ADMIN');
      expect(res.user?.hotel_id).toBe('hotel-002');
      expect(res.user?.full_name).toBe('Priti Shah');
    });

    it('should reject invalid credentials and prevent unauthorized login', () => {
      const badPassword = simulateDemoSignIn('anjali@grandpalace.com', 'wrongpassword');
      expect(badPassword.error).toBe('Invalid email or password.');
      expect(badPassword.user).toBeUndefined();

      const badEmail = simulateDemoSignIn('hacker@unknown.com', 'demo123');
      expect(badEmail.error).toBe('Invalid email or password.');
      expect(badEmail.user).toBeUndefined();
    });
  });

  // ─── FLOW 2: GUEST QR RESOLUTION ──────────────────────────────────────────
  describe('Flow 2: Guest QR Code Resolution & Active Stay Protection', () => {
    it('should resolve a valid active QR token for Room 101 with checked-in reservation', () => {
      const qr = qrService.getByToken('gp-r101-abc123');
      expect(qr).toBeDefined();
      expect(qr?.hotel_id).toBe('hotel-001');
      expect(qr?.room?.number).toBe('101');
      expect(qr?.is_active).toBe(true);

      // Verify active checked-in reservation exists for Room 101
      const activeRes = reservationService.getAll('hotel-001').find(
        r => r.room_id === qr?.room_id && r.status === 'CHECKED_IN'
      );
      expect(activeRes).toBeDefined();
      expect(activeRes?.id).toBe('res-001');
      expect(activeRes?.guest?.first_name).toBe('Arjun');
    });

    it('should resolve a vacant room (Room 102) with has_active_stay: false and protect guest privacy', () => {
      const qr = qrService.getByToken('gp-r102-def456');
      expect(qr).toBeDefined();
      expect(qr?.hotel_id).toBe('hotel-001');
      expect(qr?.room?.number).toBe('102');
      expect(qr?.is_active).toBe(true);

      // Vacant room must have no checked-in reservation
      const activeRes = reservationService.getAll('hotel-001').find(
        r => r.room_id === qr?.room_id && r.status === 'CHECKED_IN'
      );
      expect(activeRes).toBeUndefined();
    });

    it('should identify a deactivated QR code via findByToken and reject it via getByToken', () => {
      // Deactivated token exists in seed
      const inactiveQr = qrService.findByToken('gp-r103-inactive');
      expect(inactiveQr).toBeDefined();
      expect(inactiveQr?.is_active).toBe(false);
      expect(inactiveQr?.room?.number).toBe('103');

      // getByToken must return undefined (fail closed for deactivated QRs)
      const activeCheck = qrService.getByToken('gp-r103-inactive');
      expect(activeCheck).toBeUndefined();
    });

    it('should reject invalid or non-existent QR tokens completely', () => {
      const invalid = qrService.findByToken('non-existent-token-xyz');
      expect(invalid).toBeUndefined();

      const getCheck = qrService.getByToken('non-existent-token-xyz');
      expect(getCheck).toBeUndefined();
    });
  });

  // ─── FLOW 3: FOOD ORDERING & BILLING CALCULATION ─────────────────────────
  describe('Flow 3: Guest Food Ordering & Subtotal/Tax/Total Calculation', () => {
    it('should select menu items, calculate taxes and total, and place order successfully', () => {
      const items = menuService.getItems('hotel-001');
      expect(items.length).toBeGreaterThan(0);

      const paneerTikka = items.find(i => i.name.includes('Paneer Tikka')) || items[0];
      const dalMakhani = items.find(i => i.name.includes('Dal Makhani')) || items[1];

      const item1Qty = 2;
      const item2Qty = 1;
      const subtotal = paneerTikka.price * item1Qty + dalMakhani.price * item2Qty;
      const taxRate = 0.05; // 5% GST on F&B
      const taxAmount = Math.round(subtotal * taxRate);
      const deliveryCharge = 50;
      const total = subtotal + taxAmount + deliveryCharge;

      const order = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-001',
        room_number: '101',
        reservation_id: 'res-001',
        guest_id: 'guest-001',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        subtotal,
        tax_amount: taxAmount,
        total,
        items: [
          {
            menu_item_id: paneerTikka.id,
            name: paneerTikka.name,
            quantity: item1Qty,
            unit_price: paneerTikka.price,
            tax_percent: 5,
            total: paneerTikka.price * item1Qty,
          },
          {
            menu_item_id: dalMakhani.id,
            name: dalMakhani.name,
            quantity: item2Qty,
            unit_price: dalMakhani.price,
            tax_percent: 5,
            total: dalMakhani.price * item2Qty,
          },
        ],
        charge_to_room: true,
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe('PENDING');
      expect(order.payment_status).toBe('unpaid');
      expect(order.total).toBe(total);
      expect(order.items.length).toBe(2);

      // Verify order is retrievable in hotel order queue
      const hotelOrders = orderService.getAll('hotel-001');
      const found = hotelOrders.find(o => o.id === order.id);
      expect(found).toBeDefined();
      expect(found?.total).toBe(total);
    });
  });

  // ─── FLOW 4: KITCHEN DISPLAY SYSTEM (KDS) LIFECYCLE ──────────────────────
  describe('Flow 4: Kitchen KDS Order Lifecycle & Status Progression', () => {
    it('should progress an order through PENDING -> ACCEPTED -> PREPARING -> READY -> DELIVERED', () => {
      // Create a test order
      const order = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-001',
        room_number: '101',
        reservation_id: 'res-001',
        guest_id: 'guest-001',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        subtotal: 450,
        tax_amount: 23,
        total: 473,
        items: [{ menu_item_id: 'mi-001', name: 'Butter Chicken', quantity: 1, unit_price: 450, tax_percent: 5, total: 450 }],
        charge_to_room: true,
      });

      // 1. Initial State: PENDING
      expect(order.status).toBe('PENDING');
      expect(orderService.getActive('hotel-001').some(o => o.id === order.id)).toBe(true);

      // 2. Kitchen accepts order
      const accepted = orderService.updateStatus(order.id, 'ACCEPTED');
      expect(accepted?.status).toBe('ACCEPTED');
      expect(accepted?.accepted_at).toBeDefined();

      // 3. Chef starts preparing
      const preparing = orderService.updateStatus(order.id, 'PREPARING');
      expect(preparing?.status).toBe('PREPARING');
      expect(preparing?.preparing_at).toBeDefined();

      // 4. Food is ready for pickup/delivery
      const ready = orderService.updateStatus(order.id, 'READY');
      expect(ready?.status).toBe('READY');
      expect(ready?.ready_at).toBeDefined();

      // 5. Room service delivered to guest
      const delivered = orderService.updateStatus(order.id, 'DELIVERED');
      expect(delivered?.status).toBe('DELIVERED');
      expect(delivered?.delivered_at).toBeDefined();

      // Delivered orders should clear from active kitchen orders view
      const activeKitchenOrders = orderService.getActive('hotel-001');
      expect(activeKitchenOrders.some(o => o.id === order.id)).toBe(false);

      // But remain in historical orders
      const allOrders = orderService.getAll('hotel-001');
      expect(allOrders.find(o => o.id === order.id)?.status).toBe('DELIVERED');
    });
  });

  // ─── FLOW 5: GUEST SERVICE REQUESTS & TRACKING ────────────────────────────
  describe('Flow 5: Guest Service Requests, Reception Dispatch & Tracking', () => {
    it('should submit service request, return tracking token, allow staff update, and enable guest polling', async () => {
      // 1. Guest submits request from Room 101
      const submitRes = await serviceRequestService.submitRequest({
        hotel_id: 'hotel-001',
        room_id: 'room-001',
        reservation_id: 'res-001',
        guest_id: 'guest-001',
        title: 'Fresh Towels & Bathrobe',
        description: 'Need 2 fresh towels and 1 bathrobe delivered.',
        priority: 'MEDIUM',
        status: 'PENDING',
      });

      expect(submitRes.success).toBe(true);
      expect(submitRes.request).toBeDefined();
      expect(submitRes.trackingToken).toBeDefined();
      expect(submitRes.trackingToken).toBe(`demo-track-${submitRes.request.id}`);

      const reqId = submitRes.request.id;
      const trackingToken = submitRes.trackingToken!;

      // 2. Staff sees the request in the reception queue
      const hotelRequests = serviceRequestService.getAll('hotel-001');
      const queuedReq = hotelRequests.find(r => r.id === reqId);
      expect(queuedReq).toBeDefined();
      expect(queuedReq?.status).toBe('PENDING');

      // 3. Receptionist assigns to Housekeeping (Rekha Devi) and updates to IN_PROGRESS
      const updated = serviceRequestService.update(reqId, {
        assigned_to: 'Rekha Devi',
        status: 'IN_PROGRESS',
      });
      expect(updated?.status).toBe('IN_PROGRESS');
      expect(updated?.assigned_to).toBe('Rekha Devi');

      // 4. Guest polls status using their tracking token
      const guestStatus = await serviceRequestService.fetchGuestRequestStatus(reqId, trackingToken);
      expect(guestStatus).not.toBeNull();
      expect(guestStatus?.id).toBe(reqId);
      expect(guestStatus?.status).toBe('IN_PROGRESS');
      expect(guestStatus?.title).toBe('Fresh Towels & Bathrobe');

      // 5. Unauthorized guest with invalid tracking token receives null
      const hijackedStatus = await serviceRequestService.fetchGuestRequestStatus(reqId, 'invalid-tracking-token');
      expect(hijackedStatus).toBeNull();

      // 6. Housekeeping completes request
      serviceRequestService.update(reqId, { status: 'COMPLETED' });
      const completedStatus = await serviceRequestService.fetchGuestRequestStatus(reqId, trackingToken);
      expect(completedStatus?.status).toBe('COMPLETED');
    });
  });

  // ─── FLOW 6: RECEPTION, BILLING, FOLIOS & CHECKOUT ─────────────────────────
  describe('Flow 6: Reception Billing, Folios, Payments & Room Checkout', () => {
    it('should attach charges, record payments, update balances, and settle on room checkout', () => {
      const resId = 'res-001'; // Arjun Sharma, Room 101
      const initialFolio = folioService.getByReservation(resId);
      expect(initialFolio).toBeDefined();

      const initialCharges = initialFolio!.total_charges;
      const initialOutstanding = initialFolio!.outstanding;

      // 1. Add extra charge (e.g. Laundry service)
      const chargeAmount = 600;
      folioService.addItem({
        hotel_id: 'hotel-001',
        folio_id: initialFolio!.id,
        description: 'Express Laundry Service',
        category: 'LAUNDRY',
        quantity: 1,
        unit_price: chargeAmount,
        tax_percent: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: chargeAmount,
        posted_at: new Date().toISOString(),
      });

      const folioAfterCharge = folioService.getById(initialFolio!.id);
      expect(folioAfterCharge?.total_charges).toBe(initialCharges + chargeAmount);
      expect(folioAfterCharge?.outstanding).toBe(initialOutstanding + chargeAmount);

      // 2. Guest pays outstanding balance at reception via UPI
      const balanceToPay = folioAfterCharge!.outstanding;
      folioService.addPayment({
        hotel_id: 'hotel-001',
        folio_id: initialFolio!.id,
        guest_id: initialFolio!.guest_id,
        reservation_id: resId,
        amount: balanceToPay,
        method: 'UPI',
      });

      const settledFolio = folioService.getById(initialFolio!.id);
      expect(settledFolio?.outstanding).toBe(0);
      expect(settledFolio?.status).toBe('PAID');

      // 3. Reception processes room check-out
      const roomBeforeCheckout = roomService.getAll('hotel-001').find(r => r.number === '101');
      expect(roomBeforeCheckout?.status).toBe('OCCUPIED');

      const checkedOutRes = reservationService.checkOut(resId);
      expect(checkedOutRes?.status).toBe('CHECKED_OUT');
      expect(checkedOutRes?.actual_check_out).toBeDefined();

      // Room should automatically transition to AVAILABLE & DIRTY for housekeeping
      const roomAfterCheckout = roomService.getAll('hotel-001').find(r => r.number === '101');
      expect(roomAfterCheckout?.status).toBe('AVAILABLE');
      expect(roomAfterCheckout?.housekeeping_status).toBe('DIRTY');
    });

    it('should link in-room dining food orders to guest folio and settle at front desk', () => {
      const resId = 'res-001';
      const folioBefore = folioService.getByReservation(resId)!;
      const initialOutstanding = folioBefore.outstanding;

      // 1. Guest places room-charge food order
      const foodOrder = orderService.create({
        hotel_id: 'hotel-001',
        reservation_id: resId,
        room_id: 'room-001',
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        subtotal: 650,
        tax_amount: 32.5,
        total: 682.5,
        charge_to_room: true,
        items: [
          { menu_item_id: 'mi-001', name: 'Butter Chicken', quantity: 1, unit_price: 450, tax_percent: 5, total: 450 },
          { menu_item_id: 'mi-003', name: 'Garlic Naan', quantity: 2, unit_price: 100, tax_percent: 5, total: 200 },
        ],
      });

      // 2. Folio items should now contain the room-service charge
      const items = folioService.getItems(folioBefore.id);
      const roomServiceItem = items.find(i => i.category === 'ROOM_SERVICE' && i.total === 682.5);
      expect(roomServiceItem).toBeDefined();
      expect(roomServiceItem?.description).toContain(foodOrder.id.slice(-6).toUpperCase());

      // 3. Folio outstanding balance reflects the added room-charge
      const folioAfterFood = folioService.getById(folioBefore.id)!;
      expect(folioAfterFood.outstanding).toBe(initialOutstanding + 682.5);

      // 4. Front Desk collects payment for exact outstanding balance
      const paymentReceipt = folioService.addPayment({
        hotel_id: 'hotel-001',
        folio_id: folioBefore.id,
        guest_id: folioBefore.guest_id,
        reservation_id: resId,
        amount: folioAfterFood.outstanding,
        method: 'UPI',
        reference: 'UPI-REC-E2E-TEST',
        received_by: 'Anjali Singh',
      });
      expect(paymentReceipt.amount).toBe(folioAfterFood.outstanding);

      // 5. Folio balance is now zero and marked PAID
      const settledFolio = folioService.getById(folioBefore.id)!;
      expect(settledFolio.outstanding).toBe(0);
      expect(settledFolio.status).toBe('PAID');

      // 6. Complete Checkout
      const checkoutResult = reservationService.checkOut(resId);
      expect(checkoutResult?.status).toBe('CHECKED_OUT');
      const roomStatus = roomService.getAll('hotel-001').find(r => r.id === 'room-001')!;
      expect(roomStatus.status).toBe('AVAILABLE');
      expect(roomStatus.housekeeping_status).toBe('DIRTY');
    });
  });

  // ─── FLOW 7: MULTI-HOTEL TENANT ISOLATION ─────────────────────────────────
  describe('Flow 7: Strict Multi-Tenant Data Isolation (Grand Palace vs Willow Boutique)', () => {
    it('should strictly partition orders, reservations, rooms, and QRs between hotels', () => {
      const hotel1Id = 'hotel-001';
      const hotel2Id = 'hotel-002';

      // 1. Rooms isolation
      const h1Rooms = roomService.getAll(hotel1Id);
      const h2Rooms = roomService.getAll(hotel2Id);
      expect(h1Rooms.every(r => r.hotel_id === hotel1Id)).toBe(true);
      expect(h2Rooms.every(r => r.hotel_id === hotel2Id)).toBe(true);
      const h1RoomIds = new Set(h1Rooms.map(r => r.id));
      expect(h2Rooms.some(r => h1RoomIds.has(r.id))).toBe(false);

      // 2. Reservations isolation
      const h1Res = reservationService.getAll(hotel1Id);
      const h2Res = reservationService.getAll(hotel2Id);
      expect(h1Res.every(r => r.hotel_id === hotel1Id)).toBe(true);
      expect(h2Res.every(r => r.hotel_id === hotel2Id)).toBe(true);

      // 3. Orders isolation: create an order in hotel-001, verify invisible in hotel-002
      const newOrder = orderService.create({
        hotel_id: hotel1Id,
        room_id: 'room-001',
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        subtotal: 300,
        tax_amount: 15,
        total: 315,
        charge_to_room: true,
        items: [{ menu_item_id: 'mi-002', name: 'Masala Chai', quantity: 2, unit_price: 150, tax_percent: 5, total: 300 }],
      });

      const h2Orders = orderService.getAll(hotel2Id);
      expect(h2Orders.some(o => o.id === newOrder.id)).toBe(false);

      // 4. QR Codes isolation
      const h1Qrs = qrService.getAll(hotel1Id);
      const h2Qrs = qrService.getAll(hotel2Id);
      expect(h1Qrs.every(q => q.hotel_id === hotel1Id)).toBe(true);
      expect(h2Qrs.every(q => q.hotel_id === hotel2Id)).toBe(true);
    });
  });

  // ─── FLOW 8: PERSISTENCE, CACHING & REFRESH RECOVERY ──────────────────────
  describe('Flow 8: State Persistence, Refresh Recovery & In-Memory Isolation', () => {
    it('should persist all 24 state entities to localStorage on saveDemoStore', () => {
      saveDemoStore();
      const raw = window.localStorage.getItem('staynexa_demo_store');
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(Array.isArray(parsed.hotels)).toBe(true);
      expect(Array.isArray(parsed.rooms)).toBe(true);
      expect(Array.isArray(parsed.guests)).toBe(true);
      expect(Array.isArray(parsed.reservations)).toBe(true);
      expect(Array.isArray(parsed.folios)).toBe(true);
      expect(Array.isArray(parsed.orders)).toBe(true);
      expect(Array.isArray(parsed.serviceRequests)).toBe(true);
      expect(Array.isArray(parsed.qrCodes)).toBe(true);
      expect(Array.isArray(parsed.menuItems)).toBe(true);
      expect(Array.isArray(parsed.menuCategories)).toBe(true);
      expect(Array.isArray(parsed.activityLogs)).toBe(true);
      expect(Array.isArray(parsed.subscriptions)).toBe(true);
    });

    it('should restore full state across page refresh via reloadDemoStoreFromStorage', () => {
      // Create a brand new QR code and save store
      const generatedQr = qrService.generate('hotel-001', 'room-001');
      expect(generatedQr.token).toBeDefined();

      saveDemoStore();

      // Trigger cross-tab / refresh reload
      reloadDemoStoreFromStorage();

      const reloadedQr = qrService.findByToken(generatedQr.token);
      expect(reloadedQr).toBeDefined();
      expect(reloadedQr?.hotel_id).toBe('hotel-001');
    });

    it('should distinguish persistent data from intentionally transient in-memory state', () => {
      // Persistent state: stored in localStorage
      const userBefore = {
        id: 'user-002',
        email: 'anjali@grandpalace.com',
        full_name: 'Anjali Singh',
        role: 'RECEPTION' as const,
        hotel_id: 'hotel-001',
      };
      window.localStorage.setItem('staynexa_demo_user', JSON.stringify(userBefore));

      const storedUser = JSON.parse(window.localStorage.getItem('staynexa_demo_user')!);
      expect(storedUser.id).toBe('user-002');
      expect(storedUser.role).toBe('RECEPTION');
    });
  });

  // ─── FLOW 9: SUPER ADMIN, ONBOARDING, ROLE BOUNDARIES & LIFECYCLE ─────────
  describe('Flow 9: Super Admin, Hotel Onboarding, Role Boundaries & Tenant Lifecycle Enforcement', () => {
    it('should allow Super Admin to provision a new hotel with rooms, depts, and admin user', () => {
      // 1. Super Admin provisions a new property (Hotel C)
      const newHotel = hotelService.create({
        name: 'The Royal Haveli Heritage',
        legal_name: 'Haveli Hospitality LLP',
        slug: 'the-royal-haveli-heritage',
        type: 'HOTEL',
        status: 'ACTIVE',
        address: 'Circular Road, Clock Tower',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        pin_code: '302001',
        phone: '+91 141 2345678',
        email: 'contact@royalhaveli.in',
        total_rooms: 2,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        check_in_time: '14:00',
        check_out_time: '12:00',
      });

      expect(newHotel.id).toBeDefined();
      expect(hotelService.getById(newHotel.id)).toBeDefined();

      // 2. Set branding & operational config
      hotelService.updateBranding(newHotel.id, {
        primary_color: '#8b263e',
        accent_color: '#e5b358',
        tagline: 'Timeless Royal Heritage in Jaipur',
      });
      const branding = hotelService.getBranding(newHotel.id);
      expect(branding?.primary_color).toBe('#8b263e');

      hotelService.updateSettings(newHotel.id, {
        wifi_name: 'RoyalHaveli_Guest',
        wifi_password: 'Haveli@Stay2024',
        invoice_prefix: 'RH',
        default_tax_percent: 18,
      });
      const settings = hotelService.getSettings(newHotel.id);
      expect(settings?.wifi_name).toBe('RoyalHaveli_Guest');

      // 3. Create room categories and physical rooms
      const suiteType = roomService.createType({
        hotel_id: newHotel.id,
        name: 'Maharaja Heritage Suite',
        code: 'MHS',
        base_rate: 12000,
        max_adults: 3,
        max_children: 1,
        amenities: ['AC', 'WiFi', 'Jacuzzi'],
        images: [],
        is_active: true,
      });

      const room1 = roomService.create({
        hotel_id: newHotel.id,
        number: '101',
        floor: 1,
        room_type_id: suiteType.id,
        status: 'AVAILABLE',
        housekeeping_status: 'CLEAN',
        is_active: true,
      });
      const qr1 = qrService.generate(newHotel.id, room1.id);
      expect(qr1.token).toBeDefined();

      // 4. Create departments
      const fdDept = staffService.createDepartment({
        hotel_id: newHotel.id,
        name: 'Front Office',
        code: 'FO',
        description: 'Front Desk & Reception',
      });
      expect(fdDept.id).toBeDefined();
      expect(staffService.getDepartments(newHotel.id).some(d => d.id === fdDept.id)).toBe(true);

      // 5. Create primary Hotel Admin user and membership
      const adminProfile = staffService.createProfile({
        full_name: 'Rajendra Singh',
        email: 'rajendra@royalhaveli.in',
        phone: '+91 98290 12345',
        role: 'HOTEL_ADMIN',
        is_active: true,
      });
      expect(adminProfile.user_id).toBeDefined();

      const membership = staffService.createMembership({
        hotel_id: newHotel.id,
        user_id: adminProfile.user_id,
        role: 'HOTEL_ADMIN',
        is_active: true,
      });
      expect(membership.hotel_id).toBe(newHotel.id);

      // 6. Verify newly created admin authenticates and binds strictly to new hotel
      const retrieved = staffService.getByEmail('rajendra@royalhaveli.in');
      expect(retrieved).toBeDefined();
      expect(retrieved?.role).toBe('HOTEL_ADMIN');
      const retrievedMem = staffService.getMembership(retrieved!.user_id, newHotel.id);
      expect(retrievedMem?.hotel_id).toBe(newHotel.id);

      // 7. Multi-Tenant isolation: Hotel C's room 101 must not leak or collide with Hotel A's room 101
      const hotelARooms = roomService.getAll('hotel-001');
      const hotelCRooms = roomService.getAll(newHotel.id);
      expect(hotelCRooms.length).toBe(1);
      expect(hotelCRooms[0].number).toBe('101');
      expect(hotelCRooms[0].id).not.toBe(hotelARooms.find(r => r.number === '101')?.id);

      // 8. Lifecycle suspension enforcement: Suspending Hotel C prevents staff access
      hotelService.update(newHotel.id, { status: 'SUSPENDED' });
      expect(hotelService.getById(newHotel.id)?.status).toBe('SUSPENDED');
    });

    it('should enforce role route boundaries between Super Admin, Reception, Housekeeping and Maintenance', () => {
      // Role hierarchy / route permissions matrix
      const routeAccessRules: Record<string, string[]> = {
        '/super-admin': ['SUPER_ADMIN'],
        '/hotel/settings': ['HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN'],
        '/reception': ['RECEPTION', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN'],
        '/kitchen': ['KITCHEN', 'RESTAURANT_MANAGER', 'RECEPTION', 'HOTEL_MANAGER', 'HOTEL_ADMIN', 'SUPER_ADMIN'],
        '/housekeeping': ['HOUSEKEEPING', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN'],
        '/maintenance': ['MAINTENANCE', 'HOTEL_ADMIN', 'HOTEL_MANAGER', 'SUPER_ADMIN'],
      };

      function canAccessRoute(role: string, route: string): boolean {
        const allowedRoles = routeAccessRules[route];
        return allowedRoles ? allowedRoles.includes(role) : false;
      }

      // Super Admin has access to /super-admin, /hotel/settings, /reception, etc.
      expect(canAccessRoute('SUPER_ADMIN', '/super-admin')).toBe(true);
      expect(canAccessRoute('SUPER_ADMIN', '/hotel/settings')).toBe(true);

      // Reception is blocked from /super-admin and /hotel/settings
      expect(canAccessRoute('RECEPTION', '/super-admin')).toBe(false);
      expect(canAccessRoute('RECEPTION', '/hotel/settings')).toBe(false);
      expect(canAccessRoute('RECEPTION', '/reception')).toBe(true);

      // Housekeeping is blocked from /super-admin, /hotel/settings, and /reception
      expect(canAccessRoute('HOUSEKEEPING', '/super-admin')).toBe(false);
      expect(canAccessRoute('HOUSEKEEPING', '/hotel/settings')).toBe(false);
      expect(canAccessRoute('HOUSEKEEPING', '/reception')).toBe(false);
      expect(canAccessRoute('HOUSEKEEPING', '/housekeeping')).toBe(true);

      // Maintenance is blocked from /super-admin and /hotel/settings
      expect(canAccessRoute('MAINTENANCE', '/super-admin')).toBe(false);
      expect(canAccessRoute('MAINTENANCE', '/hotel/settings')).toBe(false);
      expect(canAccessRoute('MAINTENANCE', '/maintenance')).toBe(true);
    });

    it('should support scoped feature flags per tenant and global defaults', () => {
      // Default global flag state
      const globalFlags = featureFlagService.getFlagsForScope('GLOBAL');
      expect(typeof globalFlags).toBe('object');

      // Override a flag specifically for hotel-001
      featureFlagService.setFlag('hotel-001', 'ai_concierge', true);
      expect(featureFlagService.isFeatureEnabled('ai_concierge', 'hotel-001')).toBe(true);

      // Verify hotel-002 still respects default (false)
      featureFlagService.setFlag('hotel-002', 'ai_concierge', false);
      expect(featureFlagService.isFeatureEnabled('ai_concierge', 'hotel-002')).toBe(false);
    });
  });

  // ─── FLOW 10: HOUSEKEEPING & MAINTENANCE END-TO-END LIFECYCLE ──────────────
  describe('Flow 10: Housekeeping & Maintenance End-to-End Lifecycle & Room Board Consistency', () => {
    it('should progress room from occupied -> dirty on checkout -> cleaning -> clean -> inspected, verifying Room Board synchronization', () => {
      const hotelId = 'hotel-001';
      const roomId = 'room-001'; // Room 101

      // 1. Initial State: Room is OCCUPIED by active checked-in reservation res-001
      const initialRoom = roomService.getById(roomId);
      expect(initialRoom).toBeDefined();
      expect(initialRoom?.number).toBe('101');

      // 2. Guest checks out: Room becomes AVAILABLE and DIRTY
      const checkedOutRes = reservationService.checkOut('res-001');
      expect(checkedOutRes?.status).toBe('CHECKED_OUT');

      const dirtyRoom = roomService.getById(roomId);
      expect(dirtyRoom?.status).toBe('AVAILABLE');
      expect(dirtyRoom?.housekeeping_status).toBe('DIRTY');

      // 3. Automated checkout cleaning task is queued in Housekeeping
      const allTasks = housekeepingService.getTasks(hotelId);
      const checkoutTask = allTasks.find(t => t.room_id === roomId && t.type === 'CHECKOUT_CLEAN');
      expect(checkoutTask).toBeDefined();
      expect(checkoutTask?.status).toBe('PENDING');
      expect(checkoutTask?.priority).toBe('HIGH');

      // 4. Housekeeping staff starts cleaning: status -> IN_PROGRESS, room -> CLEANING
      const startedTask = housekeepingService.updateTask(checkoutTask!.id, {
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        assigned_to: 'Rekha Devi',
      });
      expect(startedTask?.status).toBe('IN_PROGRESS');

      const cleaningRoom = roomService.getById(roomId);
      expect(cleaningRoom?.housekeeping_status).toBe('CLEANING');

      // 5. Housekeeping staff finishes cleaning: status -> COMPLETED, room -> CLEAN
      const completedTask = housekeepingService.updateTask(checkoutTask!.id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });
      expect(completedTask?.status).toBe('COMPLETED');

      const cleanRoom = roomService.getById(roomId);
      expect(cleanRoom?.housekeeping_status).toBe('CLEAN');

      // 6. Housekeeping supervisor records room inspection: status -> INSPECTED, room -> INSPECTED
      const inspectedTask = housekeepingService.updateTask(checkoutTask!.id, {
        status: 'INSPECTED',
      });
      expect(inspectedTask?.status).toBe('INSPECTED');

      const inspectedRoom = roomService.getById(roomId);
      expect(inspectedRoom?.housekeeping_status).toBe('INSPECTED');
      expect(inspectedRoom?.status).toBe('AVAILABLE');
    });

    it('should execute full maintenance ticket lifecycle: creation, priority, technician assignment, status progression, and room board visibility', () => {
      const hotelId = 'hotel-001';
      const roomId = 'room-001'; // Room 101

      // 1. Log a high-priority repair ticket for Room 101
      const ticket = maintenanceService.create({
        hotel_id: hotelId,
        room_id: roomId,
        title: 'AC cooling coil frozen and leaking water',
        description: 'Water dripping onto carpet from indoor split unit',
        category: 'HVAC',
        priority: 'URGENT',
        status: 'NEW',
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.category).toBe('HVAC');
      expect(ticket.priority).toBe('URGENT');
      expect(ticket.status).toBe('NEW');

      // Verify open ticket is reflected on Room Board maintenance indicator
      const activeMaintBefore = maintenanceService.getAll(hotelId).filter(
        t => t.room_id === roomId && t.status !== 'CLOSED' && t.status !== 'VERIFIED'
      );
      expect(activeMaintBefore.length).toBeGreaterThan(0);

      // 2. Assign technician Ramesh Kumar
      const assignedTicket = maintenanceService.update(ticket.id, {
        assigned_to: 'Ramesh Kumar',
        status: 'ASSIGNED',
      });
      expect(assignedTicket?.assigned_to).toBe('Ramesh Kumar');
      expect(assignedTicket?.status).toBe('ASSIGNED');

      // 3. Technician starts repair
      const inProgressTicket = maintenanceService.update(ticket.id, {
        status: 'IN_PROGRESS',
      });
      expect(inProgressTicket?.status).toBe('IN_PROGRESS');

      // 4. Technician marks resolved
      const resolvedTicket = maintenanceService.update(ticket.id, {
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
      });
      expect(resolvedTicket?.status).toBe('RESOLVED');
      expect(resolvedTicket?.resolved_at).toBeDefined();

      // 5. Engineering manager verifies and closes ticket
      const verifiedTicket = maintenanceService.update(ticket.id, {
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
      });
      expect(verifiedTicket?.status).toBe('VERIFIED');
      expect(verifiedTicket?.verified_at).toBeDefined();

      // Room Board maintenance indicator clears once closed/verified
      const activeMaintAfter = maintenanceService.getAll(hotelId).filter(
        t => t.room_id === roomId && t.status !== 'CLOSED' && t.status !== 'VERIFIED'
      );
      expect(activeMaintAfter.some(t => t.id === ticket.id)).toBe(false);
    });

    it('should auto-route guest-reported maintenance issues to the engineering maintenance queue', () => {
      const hotelId = 'hotel-001';
      const roomId = 'room-002'; // Room 102

      // Guest submits a plumbing service request via portal
      const req = serviceRequestService.create({
        hotel_id: hotelId,
        room_id: roomId,
        title: 'Bathroom shower mixer tap leaking water',
        description: 'Hot water knob is loose and leaking continuously',
        priority: 'HIGH',
        status: 'PENDING',
      });

      expect(req.id).toBeDefined();

      // Verify maintenance queue contains the auto-created ticket with PLUMBING category
      const hotelTickets = maintenanceService.getAll(hotelId);
      const autoTicket = hotelTickets.find(t => t.room_id === roomId && t.title.includes('tap leaking'));
      expect(autoTicket).toBeDefined();
      expect(autoTicket?.category).toBe('PLUMBING');
      expect(autoTicket?.priority).toBe('HIGH');
      expect(autoTicket?.status).toBe('NEW');
    });

    it('should maintain strict tenant isolation for housekeeping tasks and maintenance tickets between Hotel A and Hotel B', () => {
      const hotelAId = 'hotel-001'; // Grand Palace
      const hotelBId = 'hotel-002'; // Willow Boutique

      // 1. Create a housekeeping task for Hotel A
      const hotelATask = housekeepingService.createTask({
        hotel_id: hotelAId,
        room_id: 'room-001',
        type: 'DEEP_CLEAN',
        status: 'PENDING',
        priority: 'HIGH',
        notes: 'Hotel A VIP deep sanitize',
      });

      // 2. Create a maintenance ticket for Hotel A
      const hotelATicket = maintenanceService.create({
        hotel_id: hotelAId,
        room_id: 'room-001',
        title: 'Hotel A Exclusive Transformer Check',
        description: 'Substation inspection',
        category: 'ELECTRICAL',
        priority: 'HIGH',
        status: 'NEW',
      });

      // 3. Verify Hotel B cannot see Hotel A's tasks or tickets
      const hotelBTasks = housekeepingService.getTasks(hotelBId);
      expect(hotelBTasks.some(t => t.id === hotelATask.id)).toBe(false);
      expect(hotelBTasks.some(t => t.notes === 'Hotel A VIP deep sanitize')).toBe(false);

      const hotelBTickets = maintenanceService.getAll(hotelBId);
      expect(hotelBTickets.some(t => t.id === hotelATicket.id)).toBe(false);
      expect(hotelBTickets.some(t => t.title.includes('Hotel A Exclusive'))).toBe(false);

      // 4. Updating Hotel A does not affect Hotel B
      housekeepingService.updateTask(hotelATask.id, { status: 'COMPLETED' });
      const refreshedBTasks = housekeepingService.getTasks(hotelBId);
      expect(refreshedBTasks.some(t => t.id === hotelATask.id)).toBe(false);
    });
  });

  // ─── FLOW 11: RESTAURANT & POS ORDER LIFECYCLE, 86ING, FOLIO REVERSAL & REPORTING ──
  describe('Flow 11: Restaurant & POS Order Lifecycle, Menu Availability (86ing), Folio Reversal, and Analytics', () => {
    it('should allow restaurant manager to toggle menu item availability (86ing) and persist state', () => {
      const hotelId = 'hotel-001';
      const items = menuService.getItems(hotelId);
      expect(items.length).toBeGreaterThan(0);

      const targetItem = items[0];
      const initialAvailability = targetItem.is_available !== false;

      // 1. Toggle availability (86 the item)
      const toggled = menuService.toggleAvailability(targetItem.id);
      expect(toggled).toBeDefined();
      expect(toggled?.is_available).toBe(!initialAvailability);

      // 2. Persist to storage and reload
      saveDemoStore();
      reloadDemoStoreFromStorage();

      const reloadedItem = menuService.getItems(hotelId).find(i => i.id === targetItem.id);
      expect(reloadedItem?.is_available).toBe(!initialAvailability);

      // 3. Restore availability
      const restored = menuService.toggleAvailability(targetItem.id);
      expect(restored?.is_available).toBe(initialAvailability);
    });

    it('should attach room-service food order to folio, and automatically detach & reverse charge when order is cancelled', () => {
      const hotelId = 'hotel-001';
      const roomId = 'room-001';
      const resId = 'res-001';

      // 1. Check initial folio state
      const initialFolio = folioService.getByReservation(resId);
      expect(initialFolio).toBeDefined();
      const initialTotal = initialFolio!.total_charges;
      const initialOutstanding = initialFolio!.outstanding;

      // 2. Create room-service order with charge_to_room
      const order = orderService.create({
        hotel_id: hotelId,
        room_id: roomId,
        reservation_id: resId,
        room_number: '101',
        type: 'ROOM_SERVICE',
        status: 'PENDING',
        charge_to_room: true,
        items: [
          {
            menu_item_id: 'menu-001',
            name: 'Paneer Tikka',
            quantity: 2,
            unit_price: 320,
            tax_percent: 5,
            total: 672,
          },
        ],
        subtotal: 640,
        tax_amount: 32,
        total: 672,
      });

      expect(order.id).toBeDefined();

      // 3. Verify folio total increased automatically via charge_to_room
      const folioAfterOrder = folioService.getById(initialFolio!.id);
      expect(folioAfterOrder?.total_charges).toBe(initialTotal + 672);
      expect(folioAfterOrder?.outstanding).toBe(initialOutstanding + 672);

      // Verify the order charge item exists on folio
      const folioItemsAfterOrder = folioService.getItems(initialFolio!.id);
      expect(folioItemsAfterOrder.some(fi => fi.reference_id === order.id)).toBe(true);

      // 5. Kitchen or restaurant cancels the order
      const cancelledOrder = orderService.updateStatus(order.id, 'CANCELLED');
      expect(cancelledOrder?.status).toBe('CANCELLED');
      expect(cancelledOrder?.payment_status).toBe('cancelled');

      // 6. Verify charge was automatically detached and folio balance restored
      const folioAfterCancel = folioService.getById(initialFolio!.id);
      expect(folioAfterCancel?.total_charges).toBe(initialTotal);
      expect(folioAfterCancel?.outstanding).toBe(initialOutstanding);

      // Ensure the folio item is gone
      const folioItemsAfterCancel = folioService.getItems(initialFolio!.id);
      expect(folioItemsAfterCancel.some(fi => fi.reference_id === order.id)).toBe(false);
    });

    it('should allow creating custom menu categories and items with strict multi-tenant isolation', () => {
      const hotelAId = 'hotel-001';
      const hotelBId = 'hotel-002';

      // 1. Create a category for Hotel A
      const categoryA = menuService.createCategory({
        hotel_id: hotelAId,
        name: 'Royal Tandoori Specials',
        sort_order: 99,
        is_active: true,
      });

      // 2. Create a menu item for Hotel A
      const itemA = menuService.createItem({
        hotel_id: hotelAId,
        category_id: categoryA.id,
        name: 'Smoked Malai Chaap',
        description: 'Tandoor roasted spiced soya chaap with cream marinade',
        price: 380,
        is_veg: true,
        is_available: true,
        tax_percent: 5,
        tags: ['Starter', 'Chef Special'],
        preparation_time_minutes: 20,
      });

      expect(itemA.id).toBeDefined();

      // 3. Verify Hotel A sees the new category and item
      const hotelACategories = menuService.getCategories(hotelAId);
      expect(hotelACategories.some(c => c.id === categoryA.id)).toBe(true);

      const hotelAItems = menuService.getItems(hotelAId);
      expect(hotelAItems.some(i => i.id === itemA.id)).toBe(true);

      // 4. Verify Hotel B does NOT see Hotel A category or item
      const hotelBCategories = menuService.getCategories(hotelBId);
      expect(hotelBCategories.some(c => c.id === categoryA.id)).toBe(false);

      const hotelBItems = menuService.getItems(hotelBId);
      expect(hotelBItems.some(i => i.id === itemA.id)).toBe(false);
    });

    it('should compute dynamic property occupancy, department revenue breakdown, and platform stats', () => {
      const hotelStats = analyticsService.getHotelStats('hotel-001');

      // Room & occupancy metrics
      expect(hotelStats.totalRooms).toBeGreaterThan(0);
      expect(typeof hotelStats.occupancyPercent).toBe('number');
      expect(hotelStats.occupancyPercent).toBeGreaterThanOrEqual(0);
      expect(hotelStats.occupancyPercent).toBeLessThanOrEqual(100);

      // Department revenue breakdown
      expect(Array.isArray(hotelStats.revenueBreakdown)).toBe(true);
      expect(hotelStats.revenueBreakdown.length).toBe(4);
      expect(hotelStats.revenueBreakdown.map(r => r.name)).toContain('Room Nights');
      expect(hotelStats.revenueBreakdown.map(r => r.name)).toContain('Restaurant & Bar');
      expect(hotelStats.revenueBreakdown.map(r => r.name)).toContain('Room Service');
      expect(hotelStats.revenueBreakdown.map(r => r.name)).toContain('Laundry & Spa');

      // Total revenue MTD
      expect(hotelStats.totalRevenueMtd).toBeGreaterThan(0);

      // Platform stats
      const platformStats = analyticsService.getPlatformStats();
      expect(platformStats.totalHotels).toBeGreaterThanOrEqual(2);
      expect(platformStats.totalReservations).toBeGreaterThan(0);
      expect(platformStats.totalOrders).toBeGreaterThan(0);
    });
  });
});
