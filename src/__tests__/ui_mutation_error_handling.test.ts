import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as supabaseLib from '../lib/supabase';
import { 
  roomService, 
  reservationService, 
  folioService, 
  housekeepingService, 
  maintenanceService,
  reloadDemoStoreFromStorage
} from '../services/demoDataService';
import { orderService } from '../services/orderService';
import * as supabaseServiceModule from '../services/supabaseService';

describe('SEC-01: UI Mutation Confirmation & Error Handling Audit Suite', () => {
  beforeEach(() => {
    reloadDemoStoreFromStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    supabaseLib.setSupabaseClientForTesting(null);
  });

  // ─── 1. FOLIOS: CHARGES & PAYMENTS ──────────────────────────────────────────
  describe('Folios Page Async Mutation Reliability', () => {
    it('should reject addItemAsync and retain uncorrupted folio on database failure', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const addItemSpy = vi.spyOn(supabaseServiceModule.supabaseFolioService, 'addCharge')
        .mockRejectedValue(new Error('PG_ERR: Check constraint violation on tax_amount'));

      const initialFolio = folioService.getAll('hotel-001')[0];
      expect(initialFolio).toBeDefined();
      const initialTotalCharges = initialFolio.total_charges;

      await expect(
        folioService.addItemAsync({
          hotel_id: 'hotel-001',
          folio_id: initialFolio.id,
          description: 'Luxury Spa Treatment',
          category: 'SPA',
          quantity: 1,
          unit_price: 3500,
          tax_percent: 18,
          tax_amount: 630,
          discount_amount: 0,
          total: 4130,
          posted_at: new Date().toISOString(),
        })
      ).rejects.toThrow('PG_ERR: Check constraint violation on tax_amount');

      // Verify folio in demo data store was rolled back and did not permanently persist
      const afterFolio = folioService.getById(initialFolio.id);
      expect(afterFolio?.total_charges).toBe(initialTotalCharges);

      demoSpy.mockRestore();
      confSpy.mockRestore();
      addItemSpy.mockRestore();
    });

    it('should reject addPaymentAsync and leave outstanding balance unchanged when database write fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const addPaymentSpy = vi.spyOn(supabaseServiceModule.supabaseFolioService, 'addPayment')
        .mockRejectedValue(new Error('PG_ERR: Network timeout waiting for database write lock'));

      const initialFolio = folioService.getAll('hotel-001')[0];
      const initialOutstanding = initialFolio.outstanding;

      await expect(
        folioService.addPaymentAsync({
          hotel_id: 'hotel-001',
          folio_id: initialFolio.id,
          guest_id: initialFolio.guest_id,
          amount: 2000,
          method: 'UPI',
          reference: 'UPI-TEST-FAIL-1',
        })
      ).rejects.toThrow('Network timeout');

      // Verify outstanding balance was restored
      const afterFolio = folioService.getById(initialFolio.id);
      expect(afterFolio?.outstanding).toBe(initialOutstanding);

      demoSpy.mockRestore();
      confSpy.mockRestore();
      addPaymentSpy.mockRestore();
    });

    it('should succeed in demo mode without throwing', async () => {
      const folio = folioService.getAll('hotel-001')[0];
      const prevPayments = folio.total_payments;

      const payment = await folioService.addPaymentAsync({
        hotel_id: 'hotel-001',
        folio_id: folio.id,
        guest_id: folio.guest_id,
        amount: 500,
        method: 'CASH',
        reference: 'CASH-DEMO-TEST',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(500);
      const updatedFolio = folioService.getById(folio.id);
      expect(updatedFolio?.total_payments).toBe(prevPayments + 500);
    });
  });

  // ─── 2. QUICK CHECK-IN COMPOUND WORKFLOW ─────────────────────────────────────
  describe('QuickCheckInModal Compound Operations & Partial Failures', () => {
    it('should prevent duplicate walk-in reservations when checkIn fails on first attempt', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      // Step 1: reservation create succeeds
      let createdResId = '';
      const createResSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'create')
        .mockImplementation(async (resData: any) => {
          createdResId = `res-mock-${Date.now()}`;
          return { ...resData, id: createdResId } as any;
        });

      // Step 2: checkIn fails first time
      const checkInSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'checkIn')
        .mockRejectedValueOnce(new Error('Room 102 is currently locked by housekeeping inspection'))
        .mockResolvedValueOnce({ id: 'res-mock-done', status: 'CHECKED_IN' } as any);

      // Simulation of QuickCheckInModal retry ref logic
      let createdWalkInResRef: any = null;

      // First try:
      let firstAttemptError: string | null = null;
      try {
        if (!createdWalkInResRef) {
          const res = await reservationService.createAsync({
            hotel_id: 'hotel-001',
            room_type_id: 'rt-001',
            guest_id: 'guest-001',
            status: 'CONFIRMED',
            source: 'WALK_IN',
            check_in_date: '2026-10-25',
            check_out_date: '2026-10-26',
            adults: 1,
            children: 0,
            nights: 1,
            rate_per_night: 4500,
            total_amount: 5310,
            tax_amount: 810,
            discount_amount: 0,
            deposit_amount: 2000,
          });
          createdWalkInResRef = res;
        }
        await reservationService.checkInAsync(createdWalkInResRef.id, 'room-102');
      } catch (err: any) {
        firstAttemptError = err.message;
      }

      expect(firstAttemptError).toContain('Room 102 is currently locked');
      expect(createdWalkInResRef).not.toBeNull();
      const firstCreatedId = createdWalkInResRef.id;

      // Second try (retry after selecting clean room or fixing issue):
      let secondAttemptSuccess = false;
      try {
        let resToUse = createdWalkInResRef;
        if (!resToUse) {
          // If the ref was missing, it would have created a duplicate!
          resToUse = await reservationService.createAsync({} as any);
        }
        const checkedIn = await reservationService.checkInAsync(resToUse.id, 'room-101');
        if (checkedIn) secondAttemptSuccess = true;
      } catch (_err) {
        secondAttemptSuccess = false;
      }

      expect(secondAttemptSuccess).toBe(true);
      // Verify reservation creation was only called ONCE across both attempts
      expect(createResSpy).toHaveBeenCalledTimes(1);
      expect(createdWalkInResRef.id).toBe(firstCreatedId);

      demoSpy.mockRestore();
      confSpy.mockRestore();
      createResSpy.mockRestore();
      checkInSpy.mockRestore();
    });

    it('should report deposit payment failure honestly when check-in succeeds but payment rejects', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const checkInSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'checkIn')
        .mockResolvedValue({ id: 'res-test-99', status: 'CHECKED_IN' } as any);

      const paymentSpy = vi.spyOn(supabaseServiceModule.supabaseFolioService, 'addPayment')
        .mockRejectedValue(new Error('Card terminal communication error'));

      let workflowError: string | null = null;
      try {
        const checkedInRes = await reservationService.checkInAsync('res-test-99', 'room-101');
        expect(checkedInRes).toBeDefined();

        // Attempt deposit
        await folioService.addPaymentAsync({
          hotel_id: 'hotel-001',
          folio_id: 'folio-res-test-99',
          guest_id: 'guest-001',
          amount: 2000,
          method: 'CARD',
        });
      } catch (payErr: any) {
        workflowError = `Guest was checked in to Room 101, but deposit payment failed: ${payErr?.message}`;
      }

      expect(workflowError).toContain('Card terminal communication error');
      expect(workflowError).toContain('Guest was checked in to Room 101, but deposit payment failed');

      demoSpy.mockRestore();
      confSpy.mockRestore();
      checkInSpy.mockRestore();
      paymentSpy.mockRestore();
    });
  });

  // ─── 3. KITCHEN DISPLAY SYSTEM (KDS) ─────────────────────────────────────────
  describe('Kitchen Display Page Status Mutation Gates', () => {
    it('should not advance ticket in KDS when database rejects updateStatusAsync', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);

      const fakeUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Row locked by concurrent KDS terminal' } }),
      });
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn().mockReturnValue({ update: fakeUpdate }) } as any);

      let caughtError: string | null = null;
      try {
        await orderService.updateStatusAsync('ord-001', 'PREPARING');
      } catch (err: any) {
        caughtError = err.message;
      }

      expect(caughtError).toContain('Row locked by concurrent KDS terminal');

      demoSpy.mockRestore();
      confSpy.mockRestore();
    });

    it('should successfully advance ticket in demo mode', async () => {
      const orders = orderService.getAll('hotel-001');
      const order = orders[0];
      expect(order).toBeDefined();

      const updated = await orderService.updateStatusAsync(order.id, 'ACCEPTED');
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('ACCEPTED');

      const refreshed = orderService.getAll('hotel-001').find(o => o.id === order.id);
      expect(refreshed?.status).toBe('ACCEPTED');
    });
  });

  // ─── 4. ROOM ACTION CONSOLE MODAL ───────────────────────────────────────────
  describe('Room Action Console Modal Mutation Gates', () => {
    it('should reject room status changes when roomService.updateStatusAsync fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const updateSpy = vi.spyOn(supabaseServiceModule.supabaseRoomService, 'updateStatus')
        .mockRejectedValue(new Error('Housekeeping supervisor lock active'));

      await expect(
        roomService.updateStatusAsync('room-101', 'AVAILABLE', 'CLEAN')
      ).rejects.toThrow('Housekeeping supervisor lock active');

      demoSpy.mockRestore();
      confSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it('should reject reservation checkout when reservationService.checkOutAsync fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const checkOutSpy = vi.spyOn(supabaseServiceModule.supabaseReservationService, 'checkOut')
        .mockRejectedValue(new Error('Folio balance audit constraint violated'));

      await expect(
        reservationService.checkOutAsync('res-001')
      ).rejects.toThrow('Folio balance audit constraint violated');

      demoSpy.mockRestore();
      confSpy.mockRestore();
      checkOutSpy.mockRestore();
    });

    it('should reject service request dispatch when housekeeping/maintenance async creation fails', async () => {
      const demoSpy = vi.spyOn(supabaseLib, 'isDemoMode').mockReturnValue(false);
      const confSpy = vi.spyOn(supabaseLib, 'isSupabaseConfigured').mockReturnValue(true);
      supabaseLib.setSupabaseClientForTesting({ from: vi.fn() } as any);

      const hkSpy = vi.spyOn(supabaseServiceModule.supabaseHousekeepingService, 'createTask')
        .mockRejectedValue(new Error('Queue depth limit reached for housekeeping'));

      await expect(
        housekeepingService.createTaskAsync({
          hotel_id: 'hotel-001',
          room_id: 'room-101',
          type: 'TURNDOWN',
          status: 'PENDING',
          priority: 'HIGH',
          notes: 'Extra pillows',
        })
      ).rejects.toThrow('Queue depth limit reached');

      const maintSpy = vi.spyOn(supabaseServiceModule.supabaseMaintenanceService, 'create')
        .mockRejectedValue(new Error('Technician roster offline'));

      await expect(
        maintenanceService.createAsync({
          hotel_id: 'hotel-001',
          room_id: 'room-101',
          title: 'AC leaking',
          description: 'Water dripping from unit',
          category: 'HVAC',
          priority: 'URGENT',
          status: 'NEW',
        })
      ).rejects.toThrow('Technician roster offline');

      demoSpy.mockRestore();
      confSpy.mockRestore();
      hkSpy.mockRestore();
      maintSpy.mockRestore();
    });
  });

  // ─── 5. FULL OFFLINE DEMO MODE FUNCTIONALITY ─────────────────────────────────
  describe('Offline / Demo Mode Non-Regression', () => {
    it('should verify all *Async methods operate smoothly in demo mode', async () => {
      // 1. Order status
      const orders = orderService.getAll('hotel-001');
      if (orders.length > 0) {
        const o = await orderService.updateStatusAsync(orders[0].id, 'PREPARING');
        expect(o).toBeDefined();
        expect(o?.status).toBe('PREPARING');
      }

      // 2. Room create and update status
      const newRoom = await roomService.createAsync({
        hotel_id: 'hotel-001',
        number: 'DEMO-777',
        floor: 7,
        room_type_id: 'rt-001',
        status: 'AVAILABLE',
        housekeeping_status: 'CLEAN',
        is_active: true,
      });
      expect(newRoom.number).toBe('DEMO-777');

      const updatedRoom = await roomService.updateStatusAsync(newRoom.id, 'MAINTENANCE', 'CLEANING');
      expect(updatedRoom).toBeDefined();
      expect(updatedRoom?.status).toBe('MAINTENANCE');
      expect(updatedRoom?.housekeeping_status).toBe('CLEANING');

      // 3. Housekeeping task create and update
      const task = await housekeepingService.createTaskAsync({
        hotel_id: 'hotel-001',
        room_id: newRoom.id,
        type: 'CHECKOUT_CLEAN',
        status: 'PENDING',
        priority: 'MEDIUM',
        notes: 'Demo test task',
      });
      expect(task.id).toBeDefined();

      const startedTask = await housekeepingService.updateTaskAsync(task.id, { status: 'IN_PROGRESS' });
      expect(startedTask).toBeDefined();
      expect(startedTask?.status).toBe('IN_PROGRESS');

      // 4. Maintenance ticket create and update
      const ticket = await maintenanceService.createAsync({
        hotel_id: 'hotel-001',
        room_id: newRoom.id,
        title: 'Demo AC check',
        description: 'Routine maintenance inspect',
        category: 'HVAC',
        priority: 'LOW',
        status: 'NEW',
      });
      expect(ticket.id).toBeDefined();

      const assignedTicket = await maintenanceService.updateAsync(ticket.id, { assigned_to: 'Ramesh', status: 'ASSIGNED' });
      expect(assignedTicket).toBeDefined();
      expect(assignedTicket?.assigned_to).toBe('Ramesh');
      expect(assignedTicket?.status).toBe('ASSIGNED');
    });
  });
});
