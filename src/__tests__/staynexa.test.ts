import { describe, it, expect, beforeEach } from 'vitest';
import { 
  hotelService, 
  roomService, 
  guestService, 
  reservationService, 
  folioService, 
  orderService, 
  housekeepingService, 
  maintenanceService,
  qrService,
  subscriptionService,
  featureFlagService,
  menuService,
  serviceRequestService,
  notificationService,
  saveDemoStore,
  resetDemoStore,
  demoDataService
} from '../services/demoDataService';
import { audioService } from '../services/audioService';
import { paymentService } from '../services/paymentService';
import { realtimeSync } from '../services/realtimeSync';
import { parseDatabaseError } from '../lib/errorHandler';

describe('STAYNEXA CORE HOTEL OPERATING SYSTEM TEST SUITE', () => {

  // ─── 1. MULTI-TENANT ISOLATION TESTS ──────────────────────────────────────
  describe('Multi-Tenant Isolation', () => {
    it('should strictly isolate rooms by hotel_id', () => {
      const hotel1Rooms = roomService.getAll('hotel-001');
      const hotel2Rooms = roomService.getAll('hotel-002');
      const hotel3Rooms = roomService.getAll('hotel-003');

      expect(hotel1Rooms.length).toBeGreaterThan(0);
      expect(hotel2Rooms.length).toBeGreaterThan(0);
      expect(hotel3Rooms.length).toBeGreaterThan(0);

      // Verify no room from Hotel 1 exists in Hotel 2
      const hotel1RoomIds = hotel1Rooms.map(r => r.id);
      hotel2Rooms.forEach(r => {
        expect(hotel1RoomIds).not.toContain(r.id);
        expect(r.hotel_id).toBe('hotel-002');
      });
    });

    it('should strictly isolate reservations by hotel_id', () => {
      const hotel1Reservations = reservationService.getAll('hotel-001');
      const hotel2Reservations = reservationService.getAll('hotel-002');

      expect(hotel1Reservations.every(r => r.hotel_id === 'hotel-001')).toBe(true);
      expect(hotel2Reservations.every(r => r.hotel_id === 'hotel-002')).toBe(true);
    });

    it('should isolate guests across hotels', () => {
      const hotel1Guests = guestService.getAll('hotel-001');
      const hotel2Guests = guestService.getAll('hotel-002');

      expect(hotel1Guests.every(g => g.hotel_id === 'hotel-001')).toBe(true);
      expect(hotel2Guests.every(g => g.hotel_id === 'hotel-002')).toBe(true);
    });
  });

  // ─── 2. RESERVATION & CHECK-IN / CHECK-OUT LIFECYCLE ───────────────────────
  describe('Reservation Operations & Lifecycle', () => {
    it('should create a reservation with CONFIRMED status and accurate pricing', () => {
      const newRes = reservationService.create({
        hotel_id: 'hotel-001',
        guest_id: 'guest-001',
        room_type_id: 'rt-001',
        status: 'CONFIRMED',
        source: 'DIRECT',
        check_in_date: '2026-11-01',
        check_out_date: '2026-11-04',
        adults: 2,
        children: 0,
        nights: 3,
        rate_per_night: 4500,
        total_amount: 15930, // 3 * 4500 + 18% GST
        tax_amount: 2430,
        discount_amount: 0,
        deposit_amount: 3000,
      });

      expect(newRes.id).toBeDefined();
      expect(newRes.status).toBe('CONFIRMED');
      expect(newRes.total_amount).toBe(15930);
    });

    it('should check in a reservation: mark room OCCUPIED and reservation CHECKED_IN', () => {
      // Find an available room
      const availableRoom = roomService.getAll('hotel-001').find(r => r.status === 'AVAILABLE');
      expect(availableRoom).toBeDefined();

      const res = reservationService.create({
        hotel_id: 'hotel-001',
        guest_id: 'guest-002',
        room_type_id: availableRoom!.room_type_id,
        status: 'CONFIRMED',
        source: 'WALK_IN',
        check_in_date: '2026-10-20',
        check_out_date: '2026-10-22',
        adults: 1,
        children: 0,
        nights: 2,
        rate_per_night: 5000,
        total_amount: 11800,
        tax_amount: 1800,
        discount_amount: 0,
        deposit_amount: 0,
      });

      // Perform check-in
      const checkedInRes = reservationService.checkIn(res.id, availableRoom!.id);
      expect(checkedInRes).toBeDefined();
      expect(checkedInRes!.status).toBe('CHECKED_IN');
      expect(checkedInRes!.actual_check_in).toBeDefined();

      // Verify room status is now OCCUPIED
      const updatedRoom = roomService.getById(availableRoom!.id);
      expect(updatedRoom?.status).toBe('OCCUPIED');
    });

    it('should check out a reservation: mark reservation CHECKED_OUT and room DIRTY for cleaning', () => {
      // Create and check in
      const room = roomService.create({
        hotel_id: 'hotel-001',
        room_type_id: 'rt-001',
        number: 'TEST-999',
        floor: 9,
        status: 'AVAILABLE',
        housekeeping_status: 'CLEAN',
        is_active: true,
      });

      const res = reservationService.create({
        hotel_id: 'hotel-001',
        guest_id: 'guest-001',
        room_type_id: room.room_type_id,
        status: 'CONFIRMED',
        source: 'DIRECT',
        check_in_date: '2026-10-18',
        check_out_date: '2026-10-19',
        adults: 1,
        children: 0,
        nights: 1,
        rate_per_night: 4500,
        total_amount: 5310,
        tax_amount: 810,
        discount_amount: 0,
        deposit_amount: 0,
      });

      reservationService.checkIn(res.id, room.id);
      expect(roomService.getById(room.id)?.status).toBe('OCCUPIED');

      // Now check out
      const checkedOut = reservationService.checkOut(res.id);
      expect(checkedOut?.status).toBe('CHECKED_OUT');

      // Crucial hospitality rule: Room operational status becomes AVAILABLE but housekeeping status becomes DIRTY
      const releasedRoom = roomService.getById(room.id);
      expect(releasedRoom?.status).toBe('AVAILABLE');
      expect(releasedRoom?.housekeeping_status).toBe('DIRTY');
    });
  });

  // ─── 3. FINANCIAL FOLIO & PAYMENT LEDGER ───────────────────────────────────
  describe('Financial Folio Ledger Calculation', () => {
    it('should accurately calculate posted charges, payments, and outstanding balance', () => {
      const folio = folioService.getByReservation('res-001');
      expect(folio).toBeDefined();

      const initialCharges = folio!.total_charges;
      const initialPayments = folio!.total_payments;
      const initialOutstanding = folio!.outstanding;

      expect(initialOutstanding).toBe(initialCharges - initialPayments);

      // Post a restaurant room charge
      const addedItem = folioService.addItem({
        folio_id: folio!.id,
        hotel_id: 'hotel-001',
        description: 'Tandoori Platter Room Service',
        category: 'ROOM_SERVICE',
        quantity: 1,
        unit_price: 1000,
        tax_percent: 5,
        tax_amount: 50,
        discount_amount: 0,
        total: 1050,
        posted_at: new Date().toISOString(),
      });

      expect(addedItem.total).toBe(1050);

      // Refetch folio
      const updatedFolio = folioService.getById(folio!.id);
      expect(updatedFolio?.total_charges).toBe(initialCharges + 1050);
      expect(updatedFolio?.outstanding).toBe(initialOutstanding + 1050);

      // Record a payment
      folioService.addPayment({
        hotel_id: 'hotel-001',
        folio_id: folio!.id,
        guest_id: folio!.guest_id,
        amount: 1050,
        method: 'UPI',
        reference: 'UPI-TEST-123',
      });

      const settledFolio = folioService.getById(folio!.id);
      expect(settledFolio?.total_payments).toBe(initialPayments + 1050);
      expect(settledFolio?.outstanding).toBe(initialOutstanding);
    });
  });

  // ─── 4. RESTAURANT & KITCHEN DISPLAY WORKFLOW ─────────────────────────────
  describe('Restaurant & KDS Workflow', () => {
    it('should advance order status sequentially: PENDING -> ACCEPTED -> PREPARING -> READY -> DELIVERED', () => {
      const order = orderService.create({
        hotel_id: 'hotel-001',
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: 500,
        tax_amount: 25,
        total: 525,
        charge_to_room: true,
        items: [
          { menu_item_id: 'mi-001', name: 'Paneer Tikka', quantity: 1, unit_price: 500, tax_percent: 5, total: 525 }
        ]
      });

      expect(order.status).toBe('PENDING');

      // KDS Accept
      const accepted = orderService.updateStatus(order.id, 'ACCEPTED');
      expect(accepted?.status).toBe('ACCEPTED');
      expect(accepted?.accepted_at).toBeDefined();

      // KDS Start Preparing
      const preparing = orderService.updateStatus(order.id, 'PREPARING');
      expect(preparing?.status).toBe('PREPARING');
      expect(preparing?.preparing_at).toBeDefined();

      // KDS Mark Ready
      const ready = orderService.updateStatus(order.id, 'READY');
      expect(ready?.status).toBe('READY');
      expect(ready?.ready_at).toBeDefined();

      // Waiter / Delivery Complete
      const delivered = orderService.updateStatus(order.id, 'DELIVERED');
      expect(delivered?.status).toBe('DELIVERED');
      expect(delivered?.delivered_at).toBeDefined();
    });
  });

  // ─── 5. HOUSEKEEPING WORKFLOW ──────────────────────────────────────────────
  describe('Housekeeping Task & Room State Synchronization', () => {
    it('should complete task and set room status to CLEAN', () => {
      const task = housekeepingService.getTasks('hotel-001')[0];
      expect(task).toBeDefined();

      housekeepingService.updateTask(task.id, { status: 'COMPLETED' });

      const updatedRoom = roomService.getById(task.room_id);
      expect(updatedRoom?.housekeeping_status).toBe('CLEAN');
    });
  });

  // ─── 6. QR CODE TOKEN RESOLUTION ──────────────────────────────────────────
  describe('QR Code Token Resolution Security', () => {
    it('should resolve a valid cryptographic token to the exact hotel and room', () => {
      const resolved = qrService.getByToken('gp-r101-abc123');
      expect(resolved).toBeDefined();
      expect(resolved?.hotel?.id).toBe('hotel-001');
      expect(resolved?.hotel?.name).toBe('Grand Palace Hotel');
      expect(resolved?.room?.number).toBe('101');
    });

    it('should reject invalid or non-existent QR tokens', () => {
      const invalid = qrService.getByToken('fake-malicious-token-xyz');
      expect(invalid).toBeUndefined();
    });

    it('should reject deactivated QR tokens', () => {
      const qr = qrService.generate('hotel-001', 'room-001');
      expect(qrService.getByToken(qr.token)).toBeDefined();

      qrService.deactivate(qr.id);
      expect(qrService.getByToken(qr.token)).toBeUndefined();
    });
  });

  // ─── 7. SUPER ADMIN TENANT & SUBSCRIPTION CONTROLS ────────────────────────
  describe('Super Admin Tenant & Subscription Controls', () => {
    it('should update hotel lifecycle status correctly', () => {
      const hotel = hotelService.getById('hotel-002');
      expect(hotel).toBeDefined();

      const updated = hotelService.update('hotel-002', { status: 'SUSPENDED' });
      expect(updated?.status).toBe('SUSPENDED');

      const refetched = hotelService.getById('hotel-002');
      expect(refetched?.status).toBe('SUSPENDED');

      // Revert back to ACTIVE
      hotelService.update('hotel-002', { status: 'ACTIVE' });
      expect(hotelService.getById('hotel-002')?.status).toBe('ACTIVE');
    });

    it('should modify tenant subscription tiers and persist changes', () => {
      const sub = subscriptionService.getByHotel('hotel-001');
      expect(sub).toBeDefined();

      const originalPlan = sub!.plan;
      const updated = subscriptionService.update(sub!.id, { plan: 'ENTERPRISE', status: 'ACTIVE' });
      expect(updated?.plan).toBe('ENTERPRISE');

      const refetched = subscriptionService.getByHotel('hotel-001');
      expect(refetched?.plan).toBe('ENTERPRISE');

      // Revert
      subscriptionService.update(sub!.id, { plan: originalPlan });
    });
  });

  // ─── 8. FEATURE FLAG SCOPING & INHERITANCE ────────────────────────────────
  describe('Platform Feature Flags Engine', () => {
    it('should provide global default flags', () => {
      const globalFlags = featureFlagService.getFlagsForScope('GLOBAL');
      expect(globalFlags.restaurant_module).toBe(true);
      expect(globalFlags.room_service).toBe(true);
      expect(globalFlags.whatsapp_notifications).toBe(false);
    });

    it('should inherit global flags and support property-specific overrides', () => {
      // Set hotel-001 specific override for whatsapp_notifications
      featureFlagService.setFlag('hotel-001', 'whatsapp_notifications', true);

      const hotel1Flags = featureFlagService.getFlagsForScope('hotel-001');
      const hotel2Flags = featureFlagService.getFlagsForScope('hotel-002');
      const globalFlags = featureFlagService.getFlagsForScope('GLOBAL');

      // hotel-001 should have it enabled
      expect(hotel1Flags.whatsapp_notifications).toBe(true);
      // other hotels should retain the global false
      expect(hotel2Flags.whatsapp_notifications).toBe(false);
      // global should remain unchanged
      expect(globalFlags.whatsapp_notifications).toBe(false);
    });
  });

  // ─── 9. KDS AUDIO SYNTHESIZER ENGINE ──────────────────────────────────────
  describe('KDS Web Audio API Synthesizer Engine', () => {
    it('should manage mute state and toggle correctly', () => {
      audioService.setMuted(false);
      expect(audioService.isAudioMuted()).toBe(false);

      const toggled = audioService.toggleMute();
      expect(toggled).toBe(true);
      expect(audioService.isAudioMuted()).toBe(true);

      audioService.setMuted(false);
      expect(audioService.isAudioMuted()).toBe(false);
    });

    it('should handle continuous alert start and stop', () => {
      audioService.setMuted(false);
      audioService.startContinuousAlert(5000);
      expect(audioService.getIsAlerting()).toBe(true);

      audioService.stopContinuousAlert();
      expect(audioService.getIsAlerting()).toBe(false);
    });
  });

  // ─── 10. IN-ROOM DINING & WATER RECLASSIFICATION ──────────────────────────
  describe('In-Room Dining vs Housekeeping Water Classification', () => {
    it('should include Paid Mineral Water in Food & Beverage menu under Beverages & Water', () => {
      const items = menuService.getItems('hotel-001');
      const mineralWater = items.find(i => i.name.includes('Packaged Mineral Water 1L'));
      const sparklingWater = items.find(i => i.name.includes('Himalayan Sparkling Water'));

      expect(mineralWater).toBeDefined();
      expect(mineralWater!.price).toBe(60);
      expect(mineralWater!.category_id).toBe('mc-004');

      expect(sparklingWater).toBeDefined();
      expect(sparklingWater!.price).toBe(150);
      expect(sparklingWater!.category_id).toBe('mc-004');

      const category = menuService.getCategories('hotel-001').find(c => c.id === 'mc-004');
      expect(category?.name).toBe('Beverages & Water');
    });

    it('should strictly exclude paid mineral water from housekeeping complimentary services', () => {
      const services = serviceRequestService.getServices('hotel-001');
      const waterService = services.find(s => s.name.toLowerCase().includes('water bottle') || s.name.toLowerCase().includes('mineral water'));
      // Housekeeping services should not list paid packaged mineral water
      expect(waterService).toBeUndefined();
    });
  });

  // ─── 11. FINANCIAL MATH & PAYMENT LEDGER ──────────────────────────────────
  describe('Strict Decimal Rounding & Payment Calculations', () => {
    it('should prevent floating-point drift with strict rounding', () => {
      const drifted = 0.1 + 0.2; // 0.30000000000000004 in raw JS
      expect(paymentService.roundCurrency(drifted)).toBe(0.3);

      const complex = 199.99 * 3; // 599.97000000000003
      expect(paymentService.roundCurrency(complex)).toBe(599.97);
    });

    it('should calculate GST tax split accurately without floating drift', () => {
      const taxInfo = paymentService.calculateTaxes(1250, 5, 10);
      expect(taxInfo.subtotal).toBe(1250);
      expect(taxInfo.totalTax).toBe(62.5); // 5% of 1250
      expect(taxInfo.cgst + taxInfo.sgst).toBe(62.5);
      expect(taxInfo.serviceCharge).toBe(125); // 10% of 1250
      expect(taxInfo.grandTotal).toBe(1437.5);
    });

    it('should record payments to folio accurately', () => {
      const folio = folioService.getAll('hotel-001')[0];
      const initialPayments = folio.total_payments;
      const initialOutstanding = folio.outstanding;

      const result = paymentService.recordPayment({
        hotelId: 'hotel-001',
        folioId: folio.id,
        amount: 500,
        method: 'UPI',
        reference: 'TEST-UPI-12345',
      });

      expect(result.payment.amount).toBe(500);
      expect(result.folio.total_payments).toBe(initialPayments + 500);
      expect(result.folio.outstanding).toBe(initialOutstanding - 500);
    });
  });

  // ─── 12. CENTRALIZED DATABASE ERROR HANDLER ───────────────────────────────
  describe('Database Error Handler & PostgreSQL Translation', () => {
    it('should translate PostgreSQL code 23505 to Unique Constraint user message', () => {
      const err = parseDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' });
      expect(err.code).toBe('23505');
      expect(err.userMessage).toContain('already exists');
      expect(err.canRetry).toBe(false);
    });

    it('should translate PostgreSQL code 42501 to RLS access denied message', () => {
      const err = parseDatabaseError({ code: '42501', message: 'permission denied for table rooms' });
      expect(err.code).toBe('42501');
      expect(err.userMessage).toContain('Access denied');
      expect(err.canRetry).toBe(false);
    });

    it('should translate connection errors as retryable', () => {
      const err = parseDatabaseError({ code: '08006', message: 'connection failure' });
      expect(err.canRetry).toBe(true);
    });
  });

  // ─── 13. GOOGLE REVIEW INTEGRATION ────────────────────────────────────────
  describe('Google Review Configuration', () => {
    it('should have google_review_url configured for hotel settings', () => {
      const settings = hotelService.getSettings('hotel-001');
      expect(settings).toBeDefined();
      expect(settings?.google_review_url).toBeDefined();
      expect(settings?.google_review_url).toContain('https://search.google.com/local/writereview');
    });
  });

  // ─── 14. REALTIME STATE SYNCHRONIZATION & EVENT BUS ────────────────────────
  describe('Realtime State Synchronization Pipeline', () => {
    it('should emit NEW_ORDER and generate desk notification when guest places an order', () => {
      let eventPayload: any = null;
      const unsubscribe = realtimeSync.subscribe('NEW_ORDER', (payload) => {
        eventPayload = payload;
      });

      const order = orderService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-001',
        guest_id: 'guest-001',
        status: 'PENDING',
        type: 'ROOM_SERVICE',
        subtotal: 450,
        tax_amount: 22.5,
        total: 472.5,
        charge_to_room: true,
        items: [
          {
            menu_item_id: 'mi-001',
            name: 'Paneer Butter Masala',
            quantity: 1,
            unit_price: 450,
            tax_percent: 5,
            total: 472.5,
          }
        ]
      });

      expect(eventPayload).not.toBeNull();
      expect(eventPayload.order.id).toBe(order.id);
      expect(eventPayload.order.status).toBe('PENDING');

      // Verify unread desk notification was created
      const unreadCount = notificationService.getUnreadCount(undefined, 'hotel-001');
      expect(unreadCount).toBeGreaterThan(0);

      const latestNotification = notificationService.getAll(undefined, 'hotel-001')[0];
      expect(latestNotification.type).toBe('ORDER');
      expect(latestNotification.title).toContain('Room');

      unsubscribe();
    });

    it('should emit ORDER_STATUS_CHANGED when kitchen advances order status', () => {
      let statusEvent: any = null;
      const unsubscribe = realtimeSync.subscribe('ORDER_STATUS_CHANGED', (payload) => {
        statusEvent = payload;
      });

      const activeOrders = orderService.getActive('hotel-001');
      expect(activeOrders.length).toBeGreaterThan(0);
      const targetOrder = activeOrders[0];

      orderService.updateStatus(targetOrder.id, 'PREPARING');

      expect(statusEvent).not.toBeNull();
      expect(statusEvent.orderId).toBe(targetOrder.id);
      expect(statusEvent.status).toBe('PREPARING');

      unsubscribe();
    });

    it('should emit NEW_SERVICE_REQUEST and auto-provision HousekeepingTask when guest requests towels/cleaning', () => {
      let requestEvent: any = null;
      let taskEvent: any = null;

      const unsubReq = realtimeSync.subscribe('NEW_SERVICE_REQUEST', (payload) => {
        requestEvent = payload;
      });
      const unsubTask = realtimeSync.subscribe('NEW_HOUSEKEEPING_TASK', (payload) => {
        taskEvent = payload;
      });

      const req = serviceRequestService.create({
        hotel_id: 'hotel-001',
        room_id: 'room-001',
        guest_id: 'guest-001',
        title: 'Extra Towels and Linens',
        description: 'Need 2 fresh bath towels for Room 101',
        priority: 'HIGH',
        status: 'PENDING',
      });

      expect(requestEvent).not.toBeNull();
      expect(requestEvent.request.id).toBe(req.id);

      // Verify auto-provisioned HousekeepingTask
      expect(taskEvent).not.toBeNull();
      expect(taskEvent.task.room_id).toBe('room-001');
      expect(taskEvent.task.priority).toBe('HIGH');
      expect(taskEvent.task.notes).toContain('Extra Towels and Linens');

      unsubReq();
      unsubTask();
    });

    it('should emit HOUSEKEEPING_TASK_UPDATED and update room status when task is completed', () => {
      let updateEvent: any = null;
      const unsubscribe = realtimeSync.subscribe('HOUSEKEEPING_TASK_UPDATED', (payload) => {
        updateEvent = payload;
      });

      const tasks = housekeepingService.getTasks('hotel-001');
      expect(tasks.length).toBeGreaterThan(0);
      const task = tasks[0];

      housekeepingService.updateTask(task.id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });

      expect(updateEvent).not.toBeNull();
      expect(updateEvent.taskId).toBe(task.id);
      expect(updateEvent.task.status).toBe('COMPLETED');

      // Verify room housekeeping status updated to CLEAN
      const room = roomService.getById(task.room_id);
      expect(room?.housekeeping_status).toBe('CLEAN');

      unsubscribe();
    });
  });

  // ─── 9. DATA PERSISTENCE & LOCALSTORAGE ENGINE (DEMO & PRODUCTION) ─────────
  describe('Data Persistence & LocalStorage Engine', () => {
    beforeEach(() => {
      // Setup mock localStorage if window is not defined in test runtime
      if (typeof window === 'undefined' || !window.localStorage) {
        const store: Record<string, string> = {};
        const mockStorage = {
          getItem: (key: string) => store[key] ?? null,
          setItem: (key: string, value: string) => { store[key] = String(value); },
          removeItem: (key: string) => { delete store[key]; },
          clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        };
        (globalThis as any).window = { localStorage: mockStorage };
        (globalThis as any).localStorage = mockStorage;
      }
    });

    it('should persist state to localStorage key staynexa_demo_store on saveDemoStore', () => {
      saveDemoStore();
      const raw = window.localStorage.getItem('staynexa_demo_store');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(Array.isArray(parsed.hotels)).toBe(true);
      expect(Array.isArray(parsed.rooms)).toBe(true);
      expect(parsed.rooms.length).toBeGreaterThan(0);
    });

    it('should write mutations to localStorage when hotel settings or rooms are updated', () => {
      const hotel = hotelService.getById('hotel-001');
      expect(hotel).toBeDefined();

      const originalPhone = hotel!.phone;
      hotelService.update('hotel-001', { phone: '+91-9999988888' });

      const raw = window.localStorage.getItem('staynexa_demo_store');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      const updatedHotel = parsed.hotels.find((h: any) => h.id === 'hotel-001');
      expect(updatedHotel?.phone).toBe('+91-9999988888');

      // Revert back
      hotelService.update('hotel-001', { phone: originalPhone });
    });

    it('should purge localStorage cache and restore initial seed state on resetDemoStore', () => {
      // Modify a room status
      const room = roomService.getAll('hotel-001')[0];
      roomService.update(room.id, { status: 'MAINTENANCE' });
      saveDemoStore();

      expect(window.localStorage.getItem('staynexa_demo_store')).not.toBeNull();

      // Reset
      resetDemoStore();

      expect(window.localStorage.getItem('staynexa_demo_store')).toBeNull();
      const freshRooms = roomService.getAll('hotel-001');
      expect(freshRooms.length).toBeGreaterThan(0);
    });

    it('should provide demoDataService with syncFromSupabase structure', async () => {
      expect(demoDataService.syncFromSupabase).toBeDefined();
      expect(typeof demoDataService.syncFromSupabase).toBe('function');
      // In demo mode or unconfigured supabase, syncFromSupabase returns false gracefully without throwing
      const result = await demoDataService.syncFromSupabase('hotel-001');
      expect(typeof result).toBe('boolean');
    });
  });
});

